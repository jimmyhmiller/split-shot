#!/usr/bin/env node
'use strict';
// Four independent executions: V8 guest source, the unspecialized interpreter,
// residual JavaScript, and the exact residual program lowered to native C.
// Usage: node docs/object-projection/test.js [--filter regex] [--no-build]
//        [--no-native] [--keep] [--output path] [--timeout-ms n]
// --no-native is an explicitly partial run, never a four-way pass.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const cp = require('node:child_process');
const { isDeepStrictEqual } = require('node:util');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '../..');
const options = { build: true, native: true, keep: false, filter: null,
  output: path.join(__dirname, 'test-results.json'), timeout: 120000 };
for (let i = 2; i < process.argv.length; ++i) {
  const arg = process.argv[i];
  if (arg === '--no-build') options.build = false;
  else if (arg === '--no-native') options.native = false;
  else if (arg === '--keep') options.keep = true;
  else if (arg === '--filter') options.filter = new RegExp(process.argv[++i]);
  else if (arg === '--output') options.output = path.resolve(process.argv[++i]);
  else if (arg === '--timeout-ms') options.timeout = Number(process.argv[++i]);
  else throw new Error('unknown option: ' + arg);
}
if (!(options.timeout > 0)) throw new Error('--timeout-ms must be positive');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'object-projection-tests-'));
const runtime = require('./intrinsics.js');
const project = process.env.OBJECT_PROJECT || path.join(root, '..', 'target/release/object-project');
const lower = process.env.OBJECT_TO_C || path.join(root, '..', 'target/release/object-to-c');
const compiler = process.env.CC || 'clang';
const defaultInputs = ['-3', '-0', '0', '1', '3', '5'];
const report = {
  schemaVersion: 1, startedAt: new Date().toISOString(), node: process.version,
  platform: `${os.platform()} ${os.arch()}`, fourWay: options.native,
  filter: options.filter && options.filter.source,
  scope: 'Finite semantic fixtures for the documented object subset, not full JavaScript conformance or a Richards benchmark.',
  commands: { project, lower, compiler, cFlags: ['-std=c11', '-O2', '-ffp-contract=off', '-DOBJECT_STANDALONE', '-lm'],
    // A second native build collects at every allocation, checks every analysis
    // proof and every "cannot collect" classification, and poisons freed cells.
    checkedFlags: ['-std=c11', '-O1', '-g', '-ffp-contract=off', '-DOBJECT_STANDALONE', '-DOC_GC_STRESS',
      '-DOC_VERIFY_PROOFS', '-fsanitize=address,undefined', '-fno-sanitize-recover=all', '-lm'] },
  cases: [],
};
function run(command, args, timeout = options.timeout) {
  const start = performance.now();
  const p = cp.spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout,
    env: { ...process.env, ASAN_OPTIONS: 'detect_leaks=0' },
    maxBuffer: 64 * 1024 * 1024 });
  return { ok: p.status === 0 && !p.error, status: p.status, signal: p.signal,
    error: p.error ? p.error.message : null, stdout: p.stdout || '', stderr: p.stderr || '',
    elapsedMs: Math.round(performance.now() - start) };
}
function compact(p) {
  return { status: p.status, signal: p.signal, error: p.error,
    stderr: p.stderr.slice(-16000), elapsedMs: p.elapsedMs };
}
function numeric(n) {
  return Object.is(n, -0) ? '-0' : Number.isNaN(n) ? 'NaN' :
    n === Infinity ? 'Infinity' : n === -Infinity ? '-Infinity' : n;
}
function original(value, seen = new Set()) {
  if (value === undefined) return ['undefined'];
  if (value === null) return ['null'];
  if (typeof value === 'number') return ['number', numeric(value)];
  if (typeof value === 'boolean' || typeof value === 'string') return [typeof value, value];
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new Error('cyclic result is outside test serialization');
    seen.add(value);
    const out = ['array', Array.from({ length: value.length }, (_, i) =>
      Object.hasOwn(value, i) ? original(value[i], seen) : ['hole'])];
    seen.delete(value); return out;
  }
  throw new Error('return primitives/arrays, or test object properties and identities inside the fixture');
}
function boxed(value, seen = new Set()) {
  if (!value || !Number.isInteger(value.tag)) throw new Error('invalid runtime Value');
  if (value.tag === 0) return ['undefined'];
  if (value.tag === 1) return ['null'];
  if (value.tag === 2) return ['boolean', value.payload];
  if (value.tag === 3) return ['number', numeric(value.payload)];
  if (value.tag === 5) return ['string', value.payload];
  if (value.tag === 4 && value.payload.kind === 1) {
    if (seen.has(value.payload)) throw new Error('cyclic result is outside test serialization');
    seen.add(value.payload);
    const a = value.payload.elements;
    const out = ['array', Array.from({ length: a.length }, (_, i) =>
      Object.hasOwn(a, i) ? boxed(a[i], seen) : ['hole'])];
    seen.delete(value.payload); return out;
  }
  throw new Error('unsupported boxed result');
}
function thrown(error, isBoxed) {
  if (isBoxed && error && Number.isInteger(error.tag)) {
    // A guest error object of any builtin kind, thrown by the program or
    // raised by the runtime.
    if (error.tag === 4 && error.payload.kind === 3 && runtime.objGet(error, 3).tag === 5) {
      return ['throw', ['error', runtime.objGet(error, 3).payload, runtime.objGet(error, 4).payload]];
    }
    return ['throw', boxed(error)];
  }
  if (!isBoxed && Object.prototype.toString.call(error) === '[object Error]') {
    return ['throw', ['error', error.name, error.message]];
  }
  if (!isBoxed) return ['throw', original(error)];
  return ['runtime-error', error && error.name || 'Error', String(error && error.message || error)];
}
function observe(fn, normalize, isBoxed) {
  let result;
  try { result = fn(); } catch (e) { return thrown(e, isBoxed); }
  try { return normalize(result); }
  catch (e) { return ['test-serialization-error', e.message]; }
}
function originalResult(source, input) {
  const context = vm.createContext({ input });
  try { vm.runInContext(source, context, { timeout: 5000 }); }
  catch (e) { return ['fixture-load-error', e.message]; }
  return observe(() => vm.runInContext('main(input)', context, { timeout: 5000 }), original, false);
}
function compiled(source, dispatch) {
  const names = Object.keys(runtime);
  const ids = [...source.matchAll(/\bfunction\s+guest_(\d+)\s*\(/g)].map(m => Number(m[1]));
  const factory = new Function(...names, `${source}\nreturn {main,guests:{${ids.map(id => `${id}:guest_${id}`).join(',')}}};`);
  const result = factory(...names.map(name => runtime[name]));
  return {
    guestCount: ids.length,
    call(input) {
      runtime.resetObjectRuntime();
      if (dispatch) runtime.setGuestDispatcher(code => {
        if (typeof result.guests[code] !== 'function') throw new Error('missing projected guest_' + code);
        return result.guests[code](0);
      });
      const context = vm.createContext({ result, input });
      return observe(() => vm.runInContext('result.main(input)', context, { timeout: 10000 }), boxed, true);
    },
  };
}
function nativeResult(binary, input) {
  const p = run(binary, [input], 10000);
  if (!p.ok) return { value: ['native-runtime-error', p.status, p.stderr.trim()], process: compact(p) };
  try { return { value: JSON.parse(p.stdout.trim()) }; }
  catch (e) { return { value: ['native-output-error', p.stdout, e.message], process: compact(p) }; }
}
function errorClass(value) {
  if (value[0] === 'throw' && value[1] && value[1][0] === 'error') return value[1][1];
  if (value[0] === 'runtime-error') return value[1];
  return null;
}
function compare(expected, actual, errorNameOnly) {
  // Engine-generated error messages are implementation-defined. Explicitly
  // opted-in rejection fixtures compare the exception class but retain all text.
  if (errorNameOnly) return errorClass(expected) !== null && errorClass(expected) === errorClass(actual);
  return isDeepStrictEqual(expected, actual);
}
function runtimeRefusal(value, diagnostic) {
  return Array.isArray(value) &&
    (value[0] === 'runtime-error' || value[0] === 'native-runtime-error') &&
    value.join(' ').includes(diagnostic);
}
function capacityFailure(value) {
  return Array.isArray(value) &&
    (value[0] === 'runtime-error' || value[0] === 'native-runtime-error') &&
    /(?:frame|buffer).*capacity|capacity.*(?:frame|buffer)/i.test(value.join(' '));
}
function provenance() {
  const inputs = [__filename, path.join(__dirname, 'intrinsics.js'),
    path.join(__dirname, 'interpreter.js'), project, ...(options.native ? [lower] : [])];
  return Object.fromEntries(inputs.map(file => [path.relative(root, file),
    fs.existsSync(file) ? createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null]));
}
function save() {
  report.finishedAt = new Date().toISOString();
  report.summary = {};
  for (const item of report.cases) report.summary[item.status] = (report.summary[item.status] || 0) + 1;
  report.executionCount = report.cases.reduce((n, c) => n + (c.inputs || []).length * (options.native ? 5 : 3), 0);
  fs.writeFileSync(options.output, JSON.stringify(report, null, 2) + '\n');
}
function failStage(result, stage, process) {
  result.status = 'failed'; result.failedStage = stage; result.failure = compact(process);
}
try {
  if (options.build) {
    const build = run('cargo', ['build', '--release', '-p', 'c-backend', '--bin', 'object-project', '--bin', 'object-to-c'], 300000);
    report.build = compact(build);
    if (!build.ok) throw new Error('cargo build failed: ' + build.stderr);
  }
  report.provenance = provenance();
  report.compilerVersion = options.native ? run(compiler, ['--version']).stdout.split('\n')[0] : null;
  for (const filename of fs.readdirSync(path.join(__dirname, 'fixtures')).filter(n => n.endsWith('.js')).sort()) {
    const sourcePath = path.join(__dirname, 'fixtures', filename);
    const source = fs.readFileSync(sourcePath, 'utf8');
    const match = source.match(/^\/\/ @case (.*)$/m);
    if (!match) throw new Error(filename + ': missing @case metadata');
    const metadata = JSON.parse(match[1]);
    const name = filename.slice(0, -3);
    if (options.filter && !options.filter.test(name)) continue;
    const result = { name, description: metadata.description, mode: metadata.mode || 'equivalence',
      source: path.relative(root, sourcePath), comparison: metadata.errorNameOnly ? 'exception-class-only' : 'exact-tagged-values', status: 'pending' };
    report.cases.push(result);
    const ast = run(project, ['--ast', sourcePath]);
    result.encoding = compact(ast);
    if (metadata.mode === 'refusal') {
      result.status = !ast.ok && ast.status === 1 && !ast.error && ast.stderr.trim() ? 'refused-as-expected' : 'failed';
      if (result.status === 'failed') result.reason = 'Unsupported source was accepted or failed without an explicit diagnostic';
      console.log(result.status + ' ' + name); save(); continue;
    }
    if (!ast.ok) { failStage(result, 'encoding', ast); console.log('failed ' + name + ' (encoding)'); save(); continue; }
    const encoded = JSON.parse(ast.stdout);
    result.functionCount = encoded.functions.length;
    const harness = run(project, ['--harness', sourcePath]);
    if (!harness.ok) { failStage(result, 'harness', harness); save(); continue; }
    const projection = run(project, [sourcePath]);
    result.projection = compact(projection);
    if (!projection.ok) { failStage(result, 'projection', projection); console.log('failed ' + name + ' (projection)'); save(); continue; }
    result.residualBytes = Buffer.byteLength(projection.stdout);
    const residualPath = path.join(temporary, name + '.js');
    fs.writeFileSync(residualPath, projection.stdout);
    let interpreted, projected;
    try { interpreted = compiled(harness.stdout, false); projected = compiled(projection.stdout, true); }
    catch (e) { result.status = 'failed'; result.failedStage = 'javascript-load'; result.reason = e.stack; save(); continue; }
    result.projectedGuestCount = projected.guestCount;
    let binary, checked;
    if (options.native) {
      const lowering = run(lower, [residualPath]); result.lowering = compact(lowering);
      if (!lowering.ok) { failStage(result, 'C-lowering', lowering); console.log('failed ' + name + ' (C-lowering)'); save(); continue; }
      const cPath = path.join(temporary, name + '.c'); binary = path.join(temporary, name);
      fs.writeFileSync(cPath, lowering.stdout);
      const nativeCompile = run(compiler, ['-std=c11', '-O2', '-ffp-contract=off', '-DOBJECT_STANDALONE', cPath, '-lm', '-o', binary]);
      result.nativeCompile = compact(nativeCompile);
      if (!nativeCompile.ok) { failStage(result, 'C-compilation', nativeCompile); console.log('failed ' + name + ' (C-compilation)'); save(); continue; }
      checked = binary + '-checked';
      const checkedCompile = run(compiler, [...report.commands.checkedFlags.filter(f => f !== '-lm'), cPath, '-lm', '-o', checked]);
      result.checkedCompile = compact(checkedCompile);
      if (!checkedCompile.ok) { failStage(result, 'checked-C-compilation', checkedCompile); console.log('failed ' + name + ' (checked-C-compilation)'); save(); continue; }
    }
    result.inputs = [];
    for (const input of metadata.inputs || defaultInputs) {
      const inputText = String(input), numericInput = Number(inputText);
      const expected = originalResult(source, numericInput);
      const ordinary = interpreted.call(numericInput), residual = projected.call(numericInput);
      const native = options.native ? nativeResult(binary, inputText) : null;
      // The checked build must agree with the optimized one exactly.
      const stressed = options.native ? nativeResult(checked, inputText) : null;
      const agrees = !native || isDeepStrictEqual(native.value, stressed.value) ||
        (native.value[0] === 'native-runtime-error' && stressed.value[0] === 'native-runtime-error' && native.value[1] === stressed.value[1]);
      const pass = agrees && (metadata.mode === 'runtime-refusal' ?
        runtimeRefusal(ordinary, metadata.diagnostic) && runtimeRefusal(residual, metadata.diagnostic) &&
          (!native || runtimeRefusal(native.value, metadata.diagnostic)) && expected[0] !== 'throw' :
        metadata.mode === 'capacity' ?
        capacityFailure(ordinary) && capacityFailure(residual) && (!native || capacityFailure(native.value)) && expected[0] !== 'throw' :
        compare(expected, ordinary, metadata.errorNameOnly) && compare(expected, residual, metadata.errorNameOnly) && (!native || compare(expected, native.value, metadata.errorNameOnly)));
      result.inputs.push({ input: inputText, original: expected, interpreted: ordinary, projected: residual,
        ...(native ? { native: native.value, ...(native.process ? { nativeProcess: native.process } : {}),
          checkedNative: stressed.value, ...(stressed.process ? { checkedNativeProcess: stressed.process } : {}) } : {}), pass });
    }
    // A fixture may bound the optimized build's heap: unreachable cells must be reclaimed.
    if (metadata.collection && options.native) {
      const p = cp.spawnSync(binary, [String((metadata.inputs || defaultInputs)[0])], { cwd: root, encoding: 'utf8',
        timeout: options.timeout, env: { ...process.env, OC_GC_STATS: '1' } });
      let stats = null;
      try { stats = JSON.parse(p.stderr.trim().split('\n').pop()); } catch (e) { stats = null; }
      result.collection = { required: metadata.collection, observed: stats };
      const bounded = stats && stats.collections >= metadata.collection.minCollections &&
        stats.peakHeapBytes <= metadata.collection.maxPeakHeapBytes;
      if (!bounded) result.inputs.push({ input: 'collection-bound', pass: false });
    }
    result.status = result.inputs.every(x => x.pass) ?
      metadata.mode === 'capacity' ? (options.native ? 'bounded-failure-as-expected' : 'partial-bounded-failure-as-expected') :
      metadata.mode === 'runtime-refusal' ? (options.native ? 'runtime-refused-as-expected' : 'partial-runtime-refused-as-expected') :
      options.native ? 'passed' : 'partial-pass' : 'failed';
    console.log(result.status + ' ' + name + ' (' + result.inputs.length + ' inputs)');
    save();
  }
  if (!report.cases.length) throw new Error('no fixtures matched');
  report.provenanceUnchanged = isDeepStrictEqual(report.provenance, provenance());
  if (!report.provenanceUnchanged) throw new Error('Runner, runtime, interpreter, or tools changed during this run; rerun for a stable result.');
} catch (error) {
  report.fatalError = error.stack || String(error); console.error(report.fatalError);
} finally {
  if (options.keep) { report.temporaryDirectory = temporary; console.log('Artifacts: ' + temporary); }
  else fs.rmSync(temporary, { recursive: true, force: true });
  save();
}
console.log(JSON.stringify(report.summary));
console.log('Results: ' + options.output);
if (report.fatalError || report.cases.some(c => c.status === 'failed' || c.status === 'pending')) process.exitCode = 1;
