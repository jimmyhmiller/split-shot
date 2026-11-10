#!/usr/bin/env node
// Three independent executions: native guest, ordinary JS interpreter, and
// residual JS produced by specializing that interpreter with the guest AST.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const bin = path.join(root, '..', 'target/release/js-project');
const directBin = path.join(root, '..', 'target/release/js-frontend');
const write = process.argv.includes('--write-results');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'js-first-projection-'));
const resultDir = path.join(__dirname, 'results');
if (write) fs.mkdirSync(resultDir, { recursive: true });
const cases = [
  ['affine', [-9, -1, 0, 1, 7, 1.5, '4']],
  ['closure', [-8, -1, 0, 3, 11, 1.5, '3']],
  ['short-circuit', [-4, 0, 2, '', 'hello', null, undefined, false, true, NaN]],
  ['recursion', [-5, 0, 4, 1.5]],
  ['sum', [-1, 0, 1, 2, 4, 12, 37, 2.5]],
  ['arrays', [-8, 0, 1, 2, 15, 1.5]],
  ['control', [-1, 0, 1, 2, 3, 5, 8, 11, 20]],
  ['hoisting', [-1, 0, 2, 'x']],
  ['evaluation-order', [-1, 0, 2, 1.5]],
  ['numeric-edges', [-0, 0, 1, -1, 1.5, '4', null, undefined, NaN, Infinity, -Infinity]],
];
const interpreterHelpers = /\b(?:lookup|store|scope|nextIteration|invoke|binary|expression|exec|interpret|frame)\b/;
const dispatchTags = /["'](?:lit|undefined|var|bin|unary|cond|array|get|assign|update|fun|call|seq|empty|expr|return|break|continue|if|while|for|block|global|decl|mathconst|mathcall|this|new)["']/;
function command(binary, args, opts = {}) {
  const r = spawnSync(binary, args, {
    cwd: root, encoding: 'utf8', timeout: 15000, maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, SPEC_WEIGHT_BUDGET: '1000000' }, ...opts,
  });
  if (r.error) throw r.error;
  assert.equal(r.status, 0, `${path.basename(binary)} ${args.join(' ')}\n${r.stderr}`);
  return r;
}
function normalize(value) {
  if (value === undefined) return ['undefined'];
  if (typeof value === 'number') {
    if (Object.is(value, -0)) return ['number', '-0'];
    if (!Number.isFinite(value)) return ['number', String(value)];
  }
  if (Array.isArray(value)) return ['array', Array.from(value, normalize)];
  assert.ok(value === null || ['number','boolean','string'].includes(typeof value), 'result violates data-only output contract');
  return [typeof value, value];
}
function evaluate(source, input) {
  const context = vm.createContext({ input });
  try { return { value: normalize(vm.runInContext(source + '\nmain(input);', context, { timeout: 1000 })) }; }
  catch (e) { return { error: [e.name, e.message] }; }
}
let checks = 0;
const results = [];
try {
  // The interpreter is itself within the target language, not arbitrary JS.
  command(bin, ['--check-target', path.join(__dirname, 'interpreter.js')]);
  for (const [name, inputs] of cases) {
    const file = path.join(__dirname, 'fixtures', name + '.js');
    const source = fs.readFileSync(file, 'utf8');
    const ast = JSON.parse(command(bin, ['--ast', file]).stdout);
    const harness = command(bin, ['--harness', file]).stdout;
    const start = performance.now();
    const run = command(bin, [file]);
    const compileMs = performance.now() - start;
    const residual = run.stdout;
    const output = path.join(temp, name + '.js');
    fs.writeFileSync(output, residual);
    const target = JSON.parse(command(bin, ['--check-target', output]).stdout);
    assert.ok(!interpreterHelpers.test(residual), name + ': interpreter helper survived');
    assert.ok(!dispatchTags.test(residual), name + ': guest AST/dispatch survived');
    for (const input of inputs) {
      const native = evaluate(source, input);
      assert.deepEqual(evaluate(harness, input), native, name + ': interpreter vs native on ' + String(input));
      assert.deepEqual(evaluate(residual, input), native, name + ': residual vs native on ' + String(input));
      checks += 2;
    }
    // Direct PE baseline is useful context, not part of the projection pipeline.
    const direct = command(directBin, ['--js', file]).stdout.replace(/^---.*\n/, '');
    const row = { name, inputs: inputs.length, sourceBytes: Buffer.byteLength(source), astBytes: Buffer.byteLength(JSON.stringify(ast)),
      residualBytes: Buffer.byteLength(residual), directPEBytes: Buffer.byteLength(direct), compileMs: Math.round(compileMs * 10) / 10, ...target };
    results.push(row);
    console.log(`PASS ${name.padEnd(18)} ${row.residualBytes} B residual, ${row.compileMs} ms, ${inputs.length} inputs`);
    if (write) fs.writeFileSync(path.join(resultDir, name + '.js'), residual);
  }
  // Deterministic numeric-domain probes exercise the new interpreter, not just
  // the existing PE fuzzer. Keep syntax within the declared guest contract.
  let generated = 0;
  for (let seed = 0; seed < 40; seed++) {
    const k = seed % 7 + 1;
    const patterns = [
      `function main(x){var s=${k};for(var i=0;i<x;i++){if(i%3===0)continue;s+=i*${k};}return s}`,
      `function make(a){return b=>{a+=b;return a}}function main(x){var f=make(${k});var a=f(x);var b=f(${k});return a+b}`,
      `function apply(f,x){return f(x)}function main(x){var n=${k};return apply(y=>{var n=y+1;return z=>z+n},x)(n)}`,
      `function main(x){var y=${k};var a=x&&(y+=2);var b=x||(y+=3);return [a,b,y,x?y++:++y]}`,
      `function main(x){var a=[x,${k},2];var i=0;a[i++]+=(a[0]=${k+1},3);return [a[0],a[1],i]}`,
    ];
    const source = patterns[seed % patterns.length];
    const file = path.join(temp, 'generated.js'); fs.writeFileSync(file, source);
    const harness = command(bin, ['--harness', file]).stdout;
    const residual = command(bin, [file]).stdout;
    const out = path.join(temp, 'generated-target.js'); fs.writeFileSync(out, residual);
    command(bin, ['--check-target', out]);
    assert.ok(!interpreterHelpers.test(residual) && !dispatchTags.test(residual), 'generated dispatch survived');
    for (const input of [-3, -1, 0, 1, 2, 4, 7, 11]) {
      const native = evaluate(source, input);
      assert.deepEqual(evaluate(harness, input), native, `generated ${seed}: interpreter on ${input}`);
      assert.deepEqual(evaluate(residual, input), native, `generated ${seed}: projection on ${input}`);
      checks += 2;
    }
    generated++;
  }
  console.log(`PASS ${generated} generated numeric-domain programs`);
  // Syntax must reject these, rather than accidentally inventing semantics.
  const reject = [
    'function main(x){try{return x}catch(e){return 0}}',
    'function main(x){return Math.abs(x)}',
    'function main(x){return (x.push)(1)}',
    'function main(x){main=x;return x}',
    'function main(x){main++;return x}',
    'function main(x){break;return x}',
    'function main(x){continue;return x}',
    'function main(x){return "\\uD800"}',
    'function main(x){return new Date()}',
    'function main(x){return typeof x}',
    'function main(x){return [,,x]}',
    'function main(x){return eval(x)}',
  ];
  for (const source of reject) {
    const file = path.join(temp, 'reject.js'); fs.writeFileSync(file, source);
    const r = spawnSync(bin, ['--ast', file], { encoding: 'utf8', timeout: 3000 });
    assert.equal(r.status, 1, 'accepted unsupported source: ' + source);
  }
  // Ensure the target checker is substantive, not just a tag/name grep.
  for (const source of ['function main(x){return x=>x}', 'function main(x){return new Object()}',
    'function main(x){for(var i=0;i<x;i++){}return x}', 'function main(x){return eval(x)}',
    'function main(x){return Math.abs(x)}']) {
    const file = path.join(temp, 'bad-target.js'); fs.writeFileSync(file, source);
    assert.equal(spawnSync(bin, ['--check-target', file], { encoding: 'utf8', timeout: 3000 }).status, 1, source);
  }
  // Known limitation: dynamic recursion is valid for the interpreter, but the
  // current PE cannot preserve static syntax across its recursive residual call.
  const rec = path.join(__dirname, 'fixtures/dynamic-recursion.js');
  const harness = command(bin, ['--harness', rec]).stdout;
  assert.deepEqual(evaluate(harness, 6), evaluate(fs.readFileSync(rec, 'utf8'), 6));
  const limit = spawnSync(bin, [rec], { cwd: root, encoding: 'utf8', timeout: 5000,
    env: { ...process.env, SPEC_WEIGHT_BUDGET: '100000' }, maxBuffer: 1024 * 1024 });
  const limitation = { name: 'dynamic-recursion', status: 'LIMIT', reason: limit.error?.code ||
    (limit.stderr.includes('specialization budget exceeded') ? 'specialization budget exceeded' : 'unexpected outcome') };
  assert.ok(limitation.reason !== 'unexpected outcome', limit.stderr);
  console.log('LIMIT dynamic-recursion: ' + limitation.reason);
  const summary = { baseCommit: '69af4d25b', interpreterBytes: fs.statSync(path.join(__dirname, 'interpreter.js')).size,
    generatedPrograms: generated, differentialComparisons: checks, rejectedSources: reject.length, results, limitations: [limitation] };
  if (write) fs.writeFileSync(path.join(resultDir, 'metrics.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(`${cases.length} fixtures + ${generated} generated programs passed; ${checks} differential comparisons; ${reject.length} unsupported sources rejected; 1 documented PE limit.`);
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
