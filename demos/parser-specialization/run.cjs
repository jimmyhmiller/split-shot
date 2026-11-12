const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const os = require('node:os');
const assert = require('node:assert/strict');
const {spawnSync, execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const specs = require('./grammars.cjs').filter(s => !process.env.PARSER_CASE || s.name === process.env.PARSER_CASE);
const root = path.resolve(__dirname, '../..');
const out = path.join(__dirname, 'generated');
const binary = path.join(root, 'target/release/js-frontend');
const specializationEnv = {PE_NO_SHARED_CONTEXTS: '1', PE_CONTEXT_POINTS: '1'};
const parser = fs.readFileSync(path.join(__dirname, 'parser.js'), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
const median = values => [...values].sort((a,b) => a-b)[values.length >> 1];
function load(source, expression) {
  // Both variants use the same realm and builtins, each with isolated lexical scope.
  return vm.runInThisContext(`(function(){${source}\nreturn ${expression};})()`);
}
function verify(spec, generic, specialized) {
  let state = 7321;
  const random = n => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state % n; };
  const inputs = [...spec.seeds, ...spec.workload];
  const alphabet = '01239abAZ_=;+*/- ?\n\u0000é';
  for (let i = 0; i < 2000; i++) {
    let s = '';
    const length = random(70);
    for (let j = 0; j < length; j++) s += alphabet[random(alphabet.length)];
    inputs.push(s);
    const valid = spec.workload[random(256)];
    const pos = random(valid.length + 1);
    inputs.push(valid.slice(0, pos) + alphabet[random(alphabet.length)] + valid.slice(pos + 1));
  }
  inputs.push(spec.workload[1].repeat(100), '9'.repeat(4096), 'a'.repeat(4096));
  for (const input of [...inputs, ...inputs.slice().reverse()]) {
    // JS $ also accepts a final newline; require the match to consume the input.
    const match = spec.oracle.exec(input);
    const expected = !!match && match[0].length === input.length;
    assert.equal(generic(input), expected, `generic ${spec.name}: ${JSON.stringify(input)}`);
    assert.equal(specialized(input), expected, `residual ${spec.name}: ${JSON.stringify(input)}`);
  }
  return inputs.length * 2;
}
function measure(fn, inputs, rounds) {
  let checksum = 0;
  const start = process.hrtime.bigint();
  for (let r = 0; r < rounds; r++) for (let i = 0; i < inputs.length; i++) checksum += fn(inputs[i]) ? 1 : 0;
  return {ns: Number(process.hrtime.bigint() - start) / (rounds * inputs.length), checksum};
}
function worker() {
  return specs.map(spec => {
    const grammar = JSON.stringify(spec.grammar);
    const generic = load(parser + `\nconst grammar=${grammar};`, '(text => parse(grammar, text, 0) === text.length)');
    const residual = fs.readFileSync(path.join(out, spec.name + '.residual.js'), 'utf8');
    const specialized = load(residual, 'main');
    const checks = verify(spec, generic, specialized);
    measure(generic, spec.workload, 300);
    measure(specialized, spec.workload, 300);
    const rounds = Math.max(100, Math.ceil(20e6 / (measure(generic, spec.workload, 100).ns * 256)));
    const samples = {generic: [], specialized: []};
    for (let i = 0; i < 15; i++) {
      for (const name of i % 2 ? ['specialized', 'generic'] : ['generic', 'specialized']) {
        const result = measure(name === 'generic' ? generic : specialized, spec.workload, rounds);
        assert.equal(result.checksum, rounds * spec.workload.filter(s => generic(s)).length);
        samples[name].push(result.ns);
      }
    }
    const genericNs = median(samples.generic), specializedNs = median(samples.specialized);
    return {name: spec.name, checks, rounds, genericNs, specializedNs, speedup: genericNs / specializedNs, samples};
  });
}
if (process.argv.includes('--worker')) {
  process.stdout.write(JSON.stringify(worker()));
} else {
  execFileSync('cargo', ['build', '-q', '--release', '-p', 'js-frontend', '--bin', 'js-frontend'], {cwd: root, stdio: ['ignore','pipe','pipe']});
  fs.mkdirSync(out, {recursive: true});
  const builds = specs.map(spec => {
    const source = `function main(input) {\n${parser}\nconst grammar=${JSON.stringify(spec.grammar, null, 2)};\nreturn parse(grammar,input,0) === input.length;\n}\n`;
    const filename = path.join(out, spec.name + '.input.js');
    fs.writeFileSync(filename, source);
    const start = performance.now();
    const result = spawnSync(binary, ['--js', '--budget', '2M', filename], {env: {...process.env, ...specializationEnv}, encoding: 'utf8', timeout: 60000, maxBuffer: 32 * 1024 * 1024});
    fs.writeFileSync(path.join(out, spec.name + '.stderr.txt'), result.stderr || '');
    if (result.status !== 0) throw new Error(result.error?.message || result.stderr);
    const specializationMs = performance.now() - start;
    const residual = result.stdout.replace(/^---[^\n]*\n/, '');
    new vm.Script(residual);
    fs.writeFileSync(path.join(out, spec.name + '.residual.js'), residual);
    console.log(`${spec.name}: ${Buffer.byteLength(source)} -> ${Buffer.byteLength(residual)} bytes; ${specializationMs.toFixed(1)} ms specialization`);
    return {name: spec.name, specializationMs, sourceSha256: hash(source), residualSha256: hash(residual), sourceBytes: Buffer.byteLength(source), residualBytes: Buffer.byteLength(residual)};
  });
  const processes = Array.from({length: 3}, () => JSON.parse(execFileSync(process.execPath, [__filename, '--worker'], {encoding:'utf8'})));
  const summary = specs.map((spec, i) => ({name: spec.name, genericNs: median(processes.map(p => p[i].genericNs)), specializedNs: median(processes.map(p => p[i].specializedNs)), speedup: median(processes.map(p => p[i].speedup)), speedupRange: processes.map(p => p[i].speedup), checksPerProcess: processes[0][i].checks}));
  const report = {date: new Date().toISOString(), node: process.version, platform: process.platform, arch: process.arch, cpu: os.cpus()[0].model, specializationEnv, budget: '2M', gitHead: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(), compilerSha256: hash(fs.readFileSync(binary)), parserSha256: hash(parser), grammarsSha256: hash(fs.readFileSync(path.join(__dirname, 'grammars.cjs'))), runnerSha256: hash(fs.readFileSync(__filename)), builds, summary, processes};
  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(report, null, 2) + '\n');
  console.table(summary);
}
