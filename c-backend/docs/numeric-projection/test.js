#!/usr/bin/env node
'use strict';

// End-to-end generic guest regression suite, independent of the Nbody benchmark.
// Build first: cargo build --release -p c-backend --bin numeric-project --bin numeric-to-c
// Run: node docs/numeric-projection/test.js [fixture-name ...]
// Optional: NUMERIC_BIN_DIR=/path/to/release CC=clang node ...
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const bin = process.env.NUMERIC_BIN_DIR || path.join(root, '..', 'target/release');
const inputs = [-3, -1, 0, 1, 3, 5, 10, 19];
const env = { ...process.env, PE_CONTEXT_POINTS: '1', PE_NO_SHARED_CONTEXTS: '1', SPEC_WEIGHT_BUDGET: '150000000' };
const requested = process.argv.slice(2).map(name => name.replace(/\.js$/, ''));
const allFixtures = fs.readdirSync(path.join(__dirname, 'fixtures')).filter(name => name.endsWith('.js')).sort();
for (const name of requested) {
  if (!allFixtures.includes(name + '.js')) throw Error('Unknown fixture: ' + name);
}
const fixtures = allFixtures.filter(name => !requested.length || requested.includes(name.slice(0, -3)));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'numeric-projection-test-'));
let failures = 0;
let comparisons = 0;
const start = performance.now();
const fixtureResults = [];

function run(command, args, timeout = 30000) {
  const result = spawnSync(command, args, { cwd: root, env, encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    throw Error(`${command} ${args.join(' ')} failed: ${result.error || 'exit ' + result.status + ', signal ' + result.signal}\n${result.stderr || ''}`);
  }
  return result.stdout;
}
function evaluate(source) {
  const context = vm.createContext({
    allocF64: n => new Float64Array(n),
    loadF64: (a, i) => a[i],
    storeF64: (a, i, value) => (a[i] = value),
    f64Sqrt: Math.sqrt,
    failCapacity: () => { throw Error('numeric capacity exceeded'); },
  });
  vm.runInContext(source, context, { timeout: 5000 });
  return input => {
    context.testInput = input;
    return vm.runInContext('main(testInput)', context, { timeout: 5000 });
  };
}
function describe(value) {
  const bytes = Buffer.alloc(8);
  bytes.writeDoubleBE(value);
  return `${Object.is(value, -0) ? '-0' : String(value)} [${bytes.toString('hex')}]`;
}
function parseC(stdout) {
  const value = stdout.trim();
  if (/^[+-]?nan(?:\([^)]*\))?$/i.test(value)) return NaN;
  if (/^\+?inf(?:inity)?$/i.test(value)) return Infinity;
  if (/^-inf(?:inity)?$/i.test(value)) return -Infinity;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) throw Error('Invalid C numeric output: ' + JSON.stringify(stdout));
  return Number(value);
}

for (const fixture of fixtures) {
  const name = fixture.slice(0, -3);
  const dir = path.join(temporary, name);
  fs.mkdirSync(dir);
  const original = fs.readFileSync(path.join(__dirname, 'fixtures', fixture), 'utf8');
  const guest = path.join(dir, 'guest.js');
  const executable = path.join(dir, 'compiled');
  fs.writeFileSync(guest, original);
  const began = performance.now();
  try {
    const harness = run(path.join(bin, 'numeric-project'), ['--harness', guest]);
    fs.writeFileSync(path.join(dir, 'interpreter-harness.js'), harness);
    const residual = run(path.join(bin, 'numeric-project'), [guest], 90000);
    const residualFile = path.join(dir, 'residual.js');
    fs.writeFileSync(residualFile, residual);
    if (/\b(?:nodes|functions|lists|constants|expression|execute|invoke|pushFrame)\b/.test(residual)) {
      throw Error('Residual still contains interpreter metadata or interpreter helper identifiers');
    }
    const js = evaluate(original);
    const interpreted = evaluate(harness);
    const projected = evaluate(residual);
    const expectedResults = inputs.map(input => {
      const expected = js(input);
      if (typeof expected !== 'number') throw Error('Non-numeric original result');
      for (const [mode, actual] of Object.entries({ interpreter: interpreted(input), projected: projected(input) })) {
        // Object.is compares finite values and signed zero exactly, accepting any NaN payload.
        if (!Object.is(actual, expected)) throw Error(`${name}(${input}) ${mode}: expected ${describe(expected)}, got ${describe(actual)}`);
        comparisons++;
      }
      return expected;
    });
    fs.writeFileSync(path.join(dir, 'javascript-results.json'), JSON.stringify(inputs.map((input, i) => ({ input, original: describe(expectedResults[i]), interpreterMatches: true, projectedMatches: true })), null, 2) + '\n');
    const c = run(path.join(bin, 'numeric-to-c'), [residualFile]);
    const cFile = path.join(dir, 'generated.c');
    fs.writeFileSync(cFile, c);
    if (/\b(?:loadF64|storeF64|JSValue|js_value)\b/.test(c)) throw Error('C retained memory intrinsics or a tagged runtime');
    run(process.env.CC || 'cc', ['-std=c11', '-O2', '-ffp-contract=off', '-DNUMERIC_STANDALONE', cFile, '-lm', '-o', executable]);
    for (let i = 0; i < inputs.length; i++) {
      const actual = parseC(run(executable, [String(inputs[i])]));
      if (!Object.is(actual, expectedResults[i])) throw Error(`${name}(${inputs[i]}) C: expected ${describe(expectedResults[i])}, got ${describe(actual)}`);
      comparisons++;
    }
    fixtureResults.push({ name, status: 'passed', inputs: inputs.length, exactComparisons: inputs.length * 3, elapsedSeconds: (performance.now() - began) / 1000 });
    console.log(`PASS ${name}: ${inputs.length} inputs, all four paths (${((performance.now() - began) / 1000).toFixed(2)}s)`);
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (error) {
    failures++;
    fixtureResults.push({ name, status: 'failed', error: error.message, artifacts: dir, elapsedSeconds: (performance.now() - began) / 1000 });
    fs.rmSync(executable, { force: true });
    fs.writeFileSync(path.join(dir, 'failure.txt'), String(error.stack || error) + '\n');
    console.error(`FAIL ${name}: ${error.message}\nExact guest and available generated sources retained in ${dir}`);
  }
}
if (!failures) fs.rmSync(temporary, { recursive: true, force: true });
console.log(`${fixtures.length - failures}/${fixtures.length} fixtures passed; ${comparisons} exact comparisons; ${((performance.now() - start) / 1000).toFixed(2)}s total`);
fs.writeFileSync(path.join(__dirname, 'test-results.json'), JSON.stringify({
  command: 'node docs/numeric-projection/test.js' + (requested.length ? ' ' + requested.join(' ') : ''),
  completedAt: new Date().toISOString(),
  nodeVersion: process.version,
  inputs,
  paths: ['original Node', 'ordinary numeric interpreter', 'projected JavaScript', 'compiled C'],
  comparison: 'Object.is: exact finite values and signed zero; NaN payloads ignored',
  projectionEnvironment: { PE_CONTEXT_POINTS: '1', PE_NO_SHARED_CONTEXTS: '1', SPEC_WEIGHT_BUDGET: '150000000', PE_NO_COALESCE: null },
  cFlags: ['-std=c11', '-O2', '-ffp-contract=off', '-DNUMERIC_STANDALONE', '-lm'],
  passedFixtures: fixtures.length - failures,
  failedFixtures: failures,
  exactComparisons: comparisons,
  elapsedSeconds: (performance.now() - start) / 1000,
  fixtures: fixtureResults,
}, null, 2) + '\n');
process.exitCode = failures ? 1 : 0;
