#!/usr/bin/env node
// Bounded, reproducible native/interpreter/projected comparison of the exact C corpus input.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const os = require('node:os');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const bin = path.join(root, '..', 'target/release/js-project');
const directBin = path.join(root, '..', 'target/release/js-frontend');
const {PE_NO_SHARED_CONTEXTS: inheritedSharingFlag, ...baseEnv} = process.env;
const baselineOnly = process.argv.includes('--native-only');
const inputs = [0, 1, 2, 10, 100, 1000, 2500, 10000];
const input = 10000, samples = 7, warmup = 5;
const results = path.join(__dirname, baselineOnly ? 'native-results.json' : 'results.json');
const metrics = {timestamp: new Date().toISOString(), node: process.version, platform: process.platform,
  arch: process.arch, cpu: os.cpus()[0]?.model, input, inputs, samples, warmup,
  timing: 'Separate 120-second-bounded Node process per mode; ordinary Node globals, no vm proxy costs; 5 warmups; 7 samples; adaptive batch targeting 30 ms, capped at 100 calls. Compilation excluded. Output checked every call. Correctness separately uses vm with 20-second timeouts.',
  modes: {}, status: 'running'};
function save() {fs.writeFileSync(results, JSON.stringify(metrics, null, 2)+'\n');}
function command(binary, args, timeout = 120000, extraEnv = {}) {
  const start = performance.now();
  const result = spawnSync(binary, args, {cwd: root, encoding: 'utf8', timeout, maxBuffer: 32*1024*1024,
    env: {...baseEnv, SPEC_WEIGHT_BUDGET: process.env.SPEC_WEIGHT_BUDGET || '50000000', ...extraEnv}});
  if(result.error) throw result.error;
  assert.equal(result.status, 0, `${path.basename(binary)} ${args.join(' ')}\n${result.stderr}`);
  return {...result, elapsedMs: performance.now()-start};
}
function compile(source) {
  const context = vm.createContext({});
  vm.runInContext(source, context, {timeout: 20000});
  return {context, call(n) {context.input=n; return vm.runInContext('main(input)',context,{timeout:20000});}};
}
function benchmark(file, expected) {
  const result=command(process.execPath,[path.join(__dirname,'time-worker.js'),file,JSON.stringify(expected)],120000);
  return JSON.parse(result.stdout);
}
function inspect(source) {
  return {bytes:Buffer.byteLength(source),sha256:crypto.createHash('sha256').update(source).digest('hex'),
    interpreterHelperOccurrences:(source.match(/\b(?:lookup|store|invoke|binary|expression|exec|interpret|frame|scope|nextIteration)\b/g)||[]).length,
    dispatchTagOccurrences:(source.match(/["'](?:lit|undefined|var|bin|unary|cond|array|get|assign|update|fun|call|seq|empty|expr|return|break|continue|if|while|for|block|global|decl|mathconst|mathcall|this|new)["']/g)||[]).length,
    mathSqrtOccurrences:(source.match(/Math\.sqrt\b/g)||[]).length};
}
try {
  const source=fs.readFileSync(path.join(__dirname,'input.js'),'utf8');
  const provenance=JSON.parse(fs.readFileSync(path.join(__dirname,'provenance.json'),'utf8'));
  assert.equal(inspect(source).sha256,provenance.combinedSha256,'combined input changed');
  const original=compile(source);
  const expected=inputs.map(n=>original.call(n));
  metrics.expected=expected;
  metrics.modes.native={...inspect(source),timing:benchmark(path.join(__dirname,'input.js'),expected.at(-1))};save();
  console.log('native',JSON.stringify(metrics.modes.native.timing));
  if(!baselineOnly) {
    const harness=command(bin,['--harness',path.join(__dirname,'input.js')]);
    fs.writeFileSync(path.join(__dirname,'interpreter-harness.js'),harness.stdout);
    const ordinary=compile(harness.stdout);
    for(let i=0;i<inputs.length;i++) assert.ok(Object.is(ordinary.call(inputs[i]),expected[i]),`interpreter mismatch input ${inputs[i]}`);
    metrics.modes.interpreter={...inspect(harness.stdout),correctnessInputs:inputs,timing:benchmark(path.join(__dirname,'interpreter-harness.js'),expected.at(-1))};save();
    console.log('interpreter',JSON.stringify(metrics.modes.interpreter.timing));
    metrics.projectionEnvironment={PE_NO_SHARED_CONTEXTS:'1',SPEC_WEIGHT_BUDGET:process.env.SPEC_WEIGHT_BUDGET || '50000000'};
    const projected=command(bin,[path.join(__dirname,'input.js')],120000,{PE_NO_SHARED_CONTEXTS:'1'});
    fs.writeFileSync(path.join(__dirname,'residual.js'),projected.stdout);
    fs.writeFileSync(path.join(__dirname,'projection.log'),projected.stderr);
    const target=JSON.parse(command(bin,['--check-target',path.join(__dirname,'residual.js')]).stdout);
    const compiled=compile(projected.stdout);
    for(let i=0;i<inputs.length;i++) assert.ok(Object.is(compiled.call(inputs[i]),expected[i]),`projection mismatch input ${inputs[i]}`);
    const structure=inspect(projected.stdout);
    assert.equal(structure.interpreterHelperOccurrences,0,'interpreter helper survived');
    assert.equal(structure.dispatchTagOccurrences,0,'guest dispatch survived');
    metrics.modes.projected={...structure,target,compileMs:projected.elapsedMs,correctnessInputs:inputs,timing:benchmark(path.join(__dirname,'residual.js'),expected.at(-1))};save();
    console.log('projected',JSON.stringify(metrics.modes.projected.timing));
    try {
      const direct=command(directBin,['--js',path.join(__dirname,'input.js')]);
      const text=direct.stdout.replace(/^---.*\n/,'');
      fs.writeFileSync(path.join(__dirname,'direct-residual.js'),text);
      const compiledDirect=compile(text);
      for(let i=0;i<inputs.length;i++) assert.ok(Object.is(compiledDirect.call(inputs[i]),expected[i]),`direct PE mismatch input ${inputs[i]}`);
      metrics.modes.directPE={...inspect(text),compileMs:direct.elapsedMs,correctnessInputs:inputs,timing:benchmark(path.join(__dirname,'direct-residual.js'),expected.at(-1))};
    } catch(e) {metrics.directPEFailure=String(e);}
    metrics.ratios={interpreterOverProjected:metrics.modes.interpreter.timing.medianMs/metrics.modes.projected.timing.medianMs,
      projectedOverNative:metrics.modes.projected.timing.medianMs/metrics.modes.native.timing.medianMs};
  }
  metrics.status=baselineOnly?'native-only':'passed';save();
  console.log(JSON.stringify({status:metrics.status,ratios:metrics.ratios,results}));
} catch(e) {metrics.status='failed';metrics.failure=String(e.stack||e);save();console.error(metrics.failure);process.exitCode=1;}
