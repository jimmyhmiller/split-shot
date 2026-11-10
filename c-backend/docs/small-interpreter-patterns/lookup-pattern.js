#!/usr/bin/env node
// Controlled lookup micro-interpreters: identical bindings, AST and primitive
// semantics within each list/Map pair; only environment representation differs.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const sha256 = text => createHash('sha256').update(text).digest('hex');
const root = process.env.PE_ROOT || path.resolve(__dirname, '../..');
const bin = path.join(root, '..', 'target/release/js-frontend');
const outIndex = process.argv.indexOf('--out');
const outDir = outIndex < 0 ? fs.mkdtempSync(path.join(os.tmpdir(), 'pe-lookup-pattern-')) : path.resolve(process.argv[outIndex + 1]);
fs.mkdirSync(outDir, { recursive: true });
const flags = { SPEC_WEIGHT_BUDGET: '10000', PE_NO_SHARED_CONTEXTS: '1', PE_CONTEXT_POINTS: '1' };
const listLookup = `function lookup(env,key){var i=0;while(i<env.length){if(env[i][0]===key)return env[i][1];i=i+1;}return undefined;}`;
const mapLookup = `function lookup(env,key){return env.get(key);}`;
const evaluate = `function evaluate(node,env){if(node[0]==='literal')return node[1];if(node[0]==='input')return input[node[1]];return lookup(env,evaluate(node[1],env));}`;
const bindings = `[['alpha',11],['beta',input.value],['gamma',33]]`;
const inputs = [
  { key:'alpha', value:5 }, { key:'beta', value:5 }, { key:'gamma', value:5 }, { key:'missing', value:5 },
  { key:'beta', value:-0 }, { key:'beta', value:NaN }, { key:NaN, value:12 }, { key:undefined, value:12 },
  { key:null, value:12 }, { key:11, value:12 }, { key:'__proto__', value:12 }, { key:'toString', value:12 },
];
function load(source) { return vm.runInNewContext(source + '\nentry;', {}, { timeout: 1000 }); }
const functions = {};
const rows = [];
for (const mode of ['static', 'dynamic']) {
  const ast = ['binding', mode === 'static' ? ['literal', 'beta'] : ['input', 'key']];
  for (const representation of ['linear', 'map']) {
    const name = mode + '-' + representation;
    const lookup = representation === 'linear' ? listLookup : mapLookup;
    const env = representation === 'linear' ? 'entries' : 'new Map(entries)';
    const source = `function entry(input){\n${lookup}\n${evaluate}\nvar entries=${bindings};\nvar env=${env};\nreturn evaluate(${JSON.stringify(ast)},env);\n}\n`;
    const sourceFile = path.join(outDir, name + '.source.js');
    fs.writeFileSync(sourceFile, source);
    const start = performance.now();
    const result = spawnSync(bin, ['--js', '--entry', 'entry', sourceFile], {
      encoding: 'utf8', timeout: 10000, maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, ...flags },
    });
    assert.equal(result.status, 0, `${name}: ${result.error || result.stderr}`);
    const compileMs = performance.now() - start;
    const residual = result.stdout.replace(/^---.*\n/, '');
    fs.writeFileSync(path.join(outDir, name + '.residual.js'), residual);
    assert.ok(!/\b(?:lookup|evaluate)\s*\(/.test(residual), name + ': interpreter helper remains');
    assert.ok(!/["'](?:binding|literal|input)["']/.test(residual), name + ': AST dispatch remains');
    const originalFn = load(source), residualFn = load(residual);
    for (const input of inputs) {
      const expected = mode === 'static' ? input.value : input.key === 'alpha' ? 11 : input.key === 'beta' ? input.value : input.key === 'gamma' ? 33 : undefined;
      assert.ok(Object.is(originalFn(input), expected), name + ': interpreter mismatch');
      assert.ok(Object.is(residualFn(input), expected), name + ': residual mismatch');
    }
    functions[name + '-interpreted'] = originalFn;
    functions[name + '-residual'] = residualFn;
    rows.push({ name, ast, sourceSha256:sha256(source), residualSha256:sha256(residual), sourceBytes: Buffer.byteLength(source), residualBytes: Buffer.byteLength(residual), compileMs,
      inputChecks: inputs.length, comparisons: inputs.length * 2, lookupContainerRemains: /new Map\(/.test(residual),
      interpreterHelperCalls: 0, astDispatchTags: 0 });
  }
}
let benchmarks;
if (process.argv.includes('--bench')) {
  const count = 500000;
  const names = Object.keys(functions).filter(n => n.startsWith('dynamic-'));
  const args = ['alpha', 'beta', 'gamma', 'missing'].map(key => ({ key, value: 27 }));
  function run(fn, count) { let sum=0; for(let i=0;i<count;i++){const value=fn(args[i&3]);if(value!==undefined)sum+=value;}return sum; }
  for(const name of names){for(let i=0;i<4;i++)run(functions[name],10000);assert.equal(run(functions[name],count),71*(count/4));}
  const samples = Object.fromEntries(names.map(n => [n, []]));
  for(let round=0;round<9;round++)for(let i=0;i<names.length;i++){
    const name=names[(round+i)%names.length],start=performance.now();
    assert.equal(run(functions[name],count),71*(count/4));samples[name].push(performance.now()-start);
  }
  benchmarks=names.map(name=>{const sorted=[...samples[name]].sort((a,b)=>a-b);return{name,calls:count,medianMs:sorted[4],samplesMs:samples[name]};});
}
const summary = { gitHead:spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim(), binarySha256:sha256(fs.readFileSync(bin)), node:process.version, platform:process.platform, architecture:process.arch, flags, rows,
  comparisons:rows.reduce((n,r)=>n+r.comparisons,0), benchmarks,
  limits: [ 'Bindings are three distinct strings, not an arbitrary Map implementation.',
    'Each call constructs a fresh environment in both representations. Dynamic Map retains construction, so timings include allocation and do not isolate Map.get.',
    'Static-key Map and list both eliminate the container. Residual size is not runtime cost.',
    'Other interpreter/PE settings and mutable or duplicate bindings were not tested here.' ] };
fs.writeFileSync(path.join(outDir,'metrics.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
console.log('Artifacts: '+outDir);
