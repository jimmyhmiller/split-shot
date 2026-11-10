#!/usr/bin/env node
//
// Run prepack-revived's hard-case corpus (test/serializer/hard) through
// partial-new and score it the way its own scoreboard does.
//
//   node tools/prepack-hard.js <path-to-prepack-revived> [--suite hard] [--json out.json] [filter...]
//
// `--suite` picks another test/serializer directory (basic, abstract, ...).
//
// A test is a script defining `inspect()`; unknown values are written
// `__abstract(type, "src")` (usually as `global.__abstract ? __abstract(...) : v`),
// and `__optimize(fn)` marks functions to specialize. partial-new specializes
// a script with an entry function, so each test becomes
//
//   <the script>
//   function __pe_entry() {}
//
// with `global.__abstract ? X : fallback` reduced to `X`. The specializer is
// told (`--prepack-intrinsics`) that the environment defines Prepack's
// intrinsics with their runtime meaning: `__abstract(type, "src")` is the
// source evaluated in the global scope (once per source), an unknown value
// of that type to the specializer; `__optimize(f)` and the other annotations
// do nothing. The residual script runs with them defined; then, as in
// Prepack's protocol, the test calls the residual's `inspect()` (twice),
// which must equal the plain script's calls. `inspect` is not run at
// specialization time: it is a function the residual defines.
//
// Status per test (as in prepack's hard-scoreboard): PASS (correct, markers
// and size ratio hold), CRASH (the specializer failed or panicked, or the
// residual failed to load/run where the original did not), WRONG (a
// different result), BLOAT (correct but a marker failed or the residual is
// over the size ratio). UNSUPPORTED is reported separately from CRASH when the
// front end rejected the program (a language feature not lowered).

const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const argv = process.argv.slice(2);
const root = argv.shift();
if (!root) {
  console.error('usage: node tools/prepack-hard.js <prepack-revived> [--json out.json] [filter...]');
  process.exit(2);
}
let jsonOut = null;
let suite = 'hard';
const filters = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--json') jsonOut = argv[++i];
  else if (argv[i] === '--suite') suite = argv[++i];
  else filters.push(argv[i]);
}
// (`PE_BIN`: another build of the specializer.)
const bin = process.env.PE_BIN ? path.resolve(process.env.PE_BIN) : path.resolve(__dirname, '../target/release/js-frontend');
const hardDir = path.join(root, 'test/serializer', suite);

function walk(d) {
  let out = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

function markers(src) {
  const m = { contain: [], notContain: [], runtime: [], ratio: 2, copies: [] };
  for (const line of src.split('\n')) {
    let r;
    // (`// Copies of <regex>:<n>`: the residual matches the pattern exactly n
    // times, as Prepack's own test runner checks.)
    if ((r = line.match(/^\s*\/\/ Copies of (.*):(\d+)\s*$/))) {
      m.copies.push({ re: new RegExp(r[1].replace(/[[\]]/g, '\\$&'), 'gi'), count: Number(r[2]), text: r[1] });
      continue;
    }
    if ((r = line.match(/^\s*\/\/\s*does contain:(.*)$/))) m.contain.push(r[1].trim());
    else if ((r = line.match(/^\s*\/\/\s*does not contain:(.*)$/))) m.notContain.push(r[1].trim());
    else if ((r = line.match(/^\s*\/\/\s*add at runtime:(.*)$/))) m.runtime.push(r[1]);
    else if ((r = line.match(/^\s*\/\/\s*max size ratio:\s*([\d.]+)/))) m.ratio = Number(r[1]);
  }
  return m;
}

// `global.__abstract ? __abstract(...) : fallback` -> `__abstract(...)`, the
// same for `__abstractOrNull`, `__abstractOrUndefined` and
// `__abstractOrNullOrUndefined`.
function reduceAbstracts(src) {
  let out = '';
  let i = 0;
  // (`__abstractOrNull` and the like too: their value is the source's as
  // well; the call may be written `global.__abstract(...)`.)
  const re = /global\.(__abstract(?:OrNull|OrUndefined|OrNullOrUndefined)?)\s*\?\s*(?:global\.)?\1\(/g;
  let m;
  while ((m = re.exec(src))) {
    out += src.slice(i, m.index);
    // Copy the `__abstract(...)` call (balanced parentheses, strings).
    let j = m.index + m[0].length;
    let depth = 1;
    let str = null;
    while (j < src.length && depth > 0) {
      const c = src[j];
      if (str) {
        if (c === '\\') j++;
        else if (c === str) str = null;
      } else if (c === '"' || c === "'" || c === '`') str = c;
      else if (c === '(') depth++;
      else if (c === ')') depth--;
      j++;
    }
    const args = src.slice(m.index + m[0].length, j - 1);
    // Skip `: fallback` up to the end of the conditional expression.
    let k = j;
    while (/\s/.test(src[k])) k++;
    let fallback = null;
    if (src[k] === ':') {
      k++;
      const fstart = k;
      let d = 0;
      str = null;
      while (k < src.length) {
        const c = src[k];
        if (str) {
          if (c === '\\') k++;
          else if (c === str) str = null;
        } else if (c === '"' || c === "'" || c === '`') str = c;
        else if ('([{'.includes(c)) d++;
        else if (')]}'.includes(c)) {
          if (d === 0) break;
          d--;
        } else if ((c === ';' || c === ',' || c === '\n') && d === 0) break;
        k++;
      }
      fallback = src.slice(fstart, k).trim();
    }
    // `__abstract(type, src, fallback)`: an unknown value of `type` to the
    // specializer, the fallback (what the plain script has there) at runtime,
    // evaluated where the plain script evaluates it (it may name locals).
    const parts = splitArgs(args);
    while (fallback !== null && parts.length < 2) parts.push('undefined');
    if (fallback !== null) parts.splice(2, parts.length - 2, fallback);
    out += m[1] + '(' + parts.join(', ') + ')';
    i = k;
    re.lastIndex = k;
  }
  return out + src.slice(i);
}

// The top-level comma-separated arguments of a call's argument text.
function splitArgs(text) {
  const parts = [];
  let d = 0;
  let str = null;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (str) {
      if (c === '\\') i++;
      else if (c === str) str = null;
    } else if (c === '"' || c === "'" || c === '`') str = c;
    else if ('([{'.includes(c)) d++;
    else if (')]}'.includes(c)) d--;
    else if (c === ',' && d === 0) {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (text.slice(start).trim() !== '') parts.push(text.slice(start).trim());
  return parts;
}

// `__abstract(type, src, fallback)` in `ctx` is the fallback; `__abstract(type,
// src)` is the source evaluated in the global scope.
// `__abstract(type, src)` in `ctx`: an abstract value is its source
// evaluated (in the global scope, when first asked for), one value per
// source. With a template in place of the type (`__abstract({}, "obj")`, an
// abstract object shaped like it) whose source names nothing yet (the binding
// being defined), the value is the template itself, as the test's fallback is.
function abstractValues(ctx, onNew) {
  const values = new Map();
  return (type, src, ...fallback) => {
    if (fallback.length > 0) return fallback[0];
    if (typeof type !== 'string' && evalSource(src, ctx) === undefined) return type;
    if (!values.has(src)) {
      if (onNew) onNew(src);
      values.set(src, evalSource(src, ctx));
    }
    return values.get(src);
  };
}

// An abstract value's source string evaluated in `ctx`. A source naming a
// binding not defined yet (a nested `__abstract` inside an outer one's
// template, such as "obj1.x" while obj1 is being defined) is undefined: the
// reduced script ignores templates, so that value is never used.
function evalSource(s, ctx) {
  try {
    return vm.runInContext(s === undefined ? 'undefined' : s, ctx);
  } catch (e) {
    return undefined;
  }
}

// Execution mirrors prepack-revived's scripts/hard-scoreboard.js
// (execInContext): run the code, drain microtasks, call `inspect()`; a
// promise result is awaited (5 s); the value compared is the result followed
// by everything logged to the console. `inspect()` is called a second time
// too (the residual's escaped functions must keep working).
function makeContext() {
  const st = { log: '' };
  const write = (prefix, values) => {
    st.log += '\n' + prefix + values.join('');
  };
  const ctx = vm.createContext({
    setTimeout, setInterval, clearTimeout, clearInterval, queueMicrotask,
    console: { log: (...v) => write('', v), warn: (...v) => write('WARN:', v), error: (...v) => write('ERROR:', v) },
  });
  vm.runInContext('var global = this;\nvar self = this;', ctx);
  return { ctx, st };
}

function drainMicrotasks() {
  if (typeof process._tickCallback === 'function') process._tickCallback();
}

async function settle(result, st) {
  if (result && typeof result.then === 'function') {
    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => resolve({ value: 'Error: inspect() promise timed out', threw: true }), 5000);
    });
    const done = result.then(
      (v) => ({ value: (v + st.log).trim(), threw: false }),
      (e) => ({ value: '' + e, threw: true }),
    );
    const r = await Promise.race([done, timeout]);
    clearTimeout(timer);
    return r;
  }
  return { value: (result + st.log).trim(), threw: false };
}

async function callInspect(ctx, st) {
  let result;
  try {
    result = vm.runInContext('inspect()', ctx, { timeout: 5000 });
    drainMicrotasks();
  } catch (e) {
    return { value: '' + e, threw: true };
  }
  return settle(result, st);
}

// Prepack's intrinsics with their runtime meaning: an abstract value is its
// source's value, `__evaluatePureFunction(f)` and `__residual(type, f,
// ...args)` call `f`, the rest (annotations for Prepack) do nothing.
const INTRINSICS = {
  __abstract: (ctx) => abstractValues(ctx),
  __abstractOrNull: (ctx) => abstractValues(ctx),
  __abstractOrUndefined: (ctx) => abstractValues(ctx),
  __abstractOrNullOrUndefined: (ctx) => abstractValues(ctx),
  __evaluatePureFunction: () => (f) => f(),
  __residual: () => (type, f, ...args) => f(...args),
  __optimize: () => (f) => f,
  __optimizeReactComponentTree: () => () => {},
  __makeSimple: () => (o) => o,
  __makePartial: () => (o) => o,
  __makeFinal: () => (o) => Object.freeze(o),
  __assumeDataProperty: () => () => {},
  __assume: () => () => {},
  __debugValue: () => () => {},
  __eagerlyRequireModuleDependencies: () => (f) => f(),
};
function defineIntrinsics(ctx, names) {
  for (const n of names) ctx[n] = INTRINSICS[n](ctx);
}

// Run `src` (an original or reduced test) as the test runner does. An
// intrinsic it calls without checking for it (a ReferenceError naming one)
// is then defined, in `names`, and the run repeated: the residual gets the
// same ones.
async function runPlain(src, runtime, names) {
  for (;;) {
    const r = await runPlainOnce(src, runtime, names);
    const m = r.first.threw && r.first.value.match(/^ReferenceError: (__\w+) is not defined$/);
    if (m && INTRINSICS[m[1]] && !names.has(m[1])) {
      names.add(m[1]);
      continue;
    }
    return r;
  }
}

async function runPlainOnce(src, runtime, names) {
  const { ctx, st } = makeContext();
  defineIntrinsics(ctx, names);
  try {
    // (The `// add at runtime:` code is a script of its own: glued to the
    // test with a newline, `var a = {...}` followed by `(function () {` would
    // parse as a call.)
    vm.runInContext(runtime.join('\n'), ctx, { timeout: 5000 });
    vm.runInContext(src, ctx, { timeout: 5000 });
    drainMicrotasks();
  } catch (e) {
    return { first: { value: '' + e, threw: true } };
  }
  const first = await callInspect(ctx, st);
  st.log = '';
  const second = await callInspect(ctx, st);
  return { first, second };
}

// The residual's entry (named __pe_entry, after the script's) runs the script with the inputs; then the test
// calls the residual's `inspect()`.
// An outcome for comparison. V8 writes the source text of the expression at
// fault into some TypeError messages (`x is not iterable`, `o.f is not a
// function`); no rewrite of the program keeps that text, so for these the
// expression is left out (the error, its kind and the rest stay compared).
function normError(o) {
  if (!o.threw) return o.value;
  return o.value
    .replace(/^TypeError: .* is not iterable( \(cannot read property Symbol\(Symbol\.iterator\)\))?$/, 'TypeError: _ is not iterable')
    .replace(/^TypeError: .* is not (a function|a constructor|a function or its return value is not iterable)$/, 'TypeError: _ is not $1');
}

async function runResidual(residual, runtime, names) {
  const { ctx, st } = makeContext();
  defineIntrinsics(ctx, names);
  try {
    vm.runInContext(runtime.join('\n'), ctx, { timeout: 5000 });
  } catch (e) {
    return { loaderr: String((e && e.message) || e) };
  }
  // (The residual's top-level code is the script's, run once as it loads:
  // a throw there is the script's, as when the original runs.)
  try {
    vm.runInContext(residual + '\n;globalThis.__main = __pe_entry;', ctx, { timeout: 5000 });
  } catch (e) {
    if (e && e.name === 'SyntaxError') return { loaderr: String((e && e.message) || e) };
    return { first: { value: '' + e, threw: true } };
  }
  try {
    vm.runInContext('__main()', ctx, { timeout: 5000 });
    drainMicrotasks();
  } catch (e) {
    return { first: { value: '' + e, threw: true } };
  }
  const first = await callInspect(ctx, st);
  st.log = '';
  const second = await callInspect(ctx, st);
  return { first, second };
}

// Minified size, as prepack-revived measures it (Babel's compact, minified
// output, from the checkout's own Babel when present); otherwise without
// comments and whitespace.
let babel = null;
try {
  babel = {
    parse: require(require.resolve('@babel/parser', { paths: [root] })).parse,
    generate: require(require.resolve('@babel/generator', { paths: [root] })).default,
  };
} catch (e) {
  babel = null;
}
function entryOverhead(code) {
  const m = code.match(/function __pe_entry\((\w*)\)/);
  return m ? ('function __pe_entry(' + m[1] + '){}').length : 0;
}

function size(code) {
  if (babel) {
    try {
      const ast = babel.parse(code, { sourceType: 'script', allowReturnOutsideFunction: true });
      return babel.generate(ast, { comments: false, compact: true, minified: true }).code.length;
    } catch (e) {}
  }
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/\s+/g, '').length;
}

const files = walk(hardDir)
  .filter((f) => filters.length === 0 || filters.some((x) => f.includes(x)))
  .sort();
const results = [];
const tmp = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'pphard-'));
(async () => {
for (const file of files) {
  const rel = path.relative(hardDir, file);
  const text = fs.readFileSync(file, 'utf8');
  const mk = markers(text);
  // A test with code added at runtime runs inside a function, as Prepack's
  // runner runs it: its top-level declarations are then not globals the
  // added code may declare as well (`let x` in both).
  const src = mk.runtime.length > 0 ? `(function () {${text}\n}).call(this);\n` : text;
  const intrinsics = new Set();
  const expected = await runPlain(src, mk.runtime, intrinsics);
  const reduced = reduceAbstracts(src);
  // The script the specializer gets (abstract values read from their
  // sources) must behave as the original (fallbacks): outcomes are compared
  // as strings, a thrown error included, as in Prepack's runner.
  const asReduced = await runPlain(reduced, mk.runtime, new Set(Object.keys(INTRINSICS)));
  if (asReduced.first.value !== expected.first.value) {
    results.push({ test: rel, status: 'SKIP', detail: `reduced script differs: ${JSON.stringify(asReduced.first.value.slice(0, 60))} vs ${JSON.stringify(expected.first.value.slice(0, 60))}` });
    continue;
  }
  // The test runs as a script (its top-level declarations are globals),
  // then an empty entry.
  const wrapped = reduced + '\nfunction __pe_entry() {}\n';
  const wfile = path.join(tmp, rel.replace(/[\/]/g, '__'));
  fs.writeFileSync(wfile, wrapped);
  // (Wall time of the specializer process, startup included.)
  const t0 = process.hrtime.bigint();
  const r = spawnSync(bin, ['--js', '--prepack-intrinsics', '--closed-script', '--entry', '__pe_entry', wfile], { encoding: 'utf8', timeout: 60000 });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  if (r.status !== 0) {
    const err = ((r.stderr || '') + (r.error ? String(r.error) : '')).trim().split('\n').filter((l) => l && !l.startsWith('note:'));
    const last = err[err.length - 1] || 'exit ' + r.status;
    const panicked = /panicked/.test(r.stderr || '') || r.signal || r.error;
    results.push({ test: rel, status: panicked ? 'CRASH' : 'UNSUPPORTED', detail: last.slice(0, 200), ms });
    continue;
  }
  const residual = r.stdout.replace(/^--- residual as JavaScript.*\n/, '');
  const got = await runResidual(residual, mk.runtime, new Set(Object.keys(INTRINSICS)));
  let status = 'PASS';
  let detail = '';
  if (got.loaderr) {
    status = 'CRASH';
    detail = 'residual failed to load: ' + got.loaderr;
  } else if (normError(expected.first) !== normError(got.first)) {
    status = 'WRONG';
    detail = `expected ${JSON.stringify(expected.first.value.slice(0, 70))}, got ${JSON.stringify(got.first.value.slice(0, 70))}`;
    // (PPH_FULL=1: the whole of both values.)
    if (process.env.PPH_FULL) console.error(`--- ${rel}\nexpected: ${expected.first.value}\ngot:      ${got.first.value}`);
  } else if (expected.second && got.second && normError(expected.second) !== normError(got.second)) {
    status = 'WRONG';
    detail = `second inspect(): expected ${JSON.stringify(expected.second.value.slice(0, 60))}, got ${JSON.stringify(got.second.value.slice(0, 60))}`;
  } else {
    // (The residual's entry function is the harness's protocol, as the
    // `function __pe_entry() {}` appended to the input is: its header and
    // closing brace are not counted.)
    const ratio = (size(residual) - entryOverhead(residual)) / Math.max(1, size(src));
    const badCopies = mk.copies.find((c) => (residual.match(c.re) || []).length !== c.count);
    const failedMarker =
      mk.contain.find((x) => !residual.includes(x)) ? 'missing: ' + mk.contain.find((x) => !residual.includes(x)) :
      mk.notContain.find((x) => residual.includes(x)) ? 'contains: ' + mk.notContain.find((x) => residual.includes(x)) :
      badCopies ? `copies of ${badCopies.text}: ${(residual.match(badCopies.re) || []).length}, want ${badCopies.count}` : null;
    if (failedMarker) {
      status = 'BLOAT';
      detail = failedMarker;
    } else if (ratio > mk.ratio) {
      status = 'BLOAT';
      detail = `size ratio ${ratio.toFixed(2)} > ${mk.ratio}`;
    } else {
      detail = `ratio ${ratio.toFixed(2)}`;
    }
  }
  results.push({ test: rel, status, detail, ms });
}

const counts = {};
for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
const w = Math.max(...results.map((r) => r.test.length), 10);
for (const r of results) console.log(`${r.status.padEnd(11)} ${r.test.padEnd(w)} ${r.detail || ''}`);
// per folder table
const folders = {};
for (const r of results) {
  const f = r.test.split('/')[0];
  folders[f] = folders[f] || {};
  folders[f][r.status] = (folders[f][r.status] || 0) + 1;
}
console.log('\nfolder               PASS BLOAT WRONG CRASH UNSUP SKIP');
for (const [f, c] of Object.entries(folders)) {
  console.log(
    f.padEnd(20),
    ...['PASS', 'BLOAT', 'WRONG', 'CRASH', 'UNSUPPORTED', 'SKIP'].map((k) => String(c[k] || 0).padStart(5)),
  );
}
const times = results.filter((r) => r.ms !== undefined).map((r) => r.ms).sort((a, b) => a - b);
if (times.length > 0) {
  const at = (q) => times[Math.min(times.length - 1, Math.floor(q * times.length))].toFixed(1);
  const total = times.reduce((a, b) => a + b, 0);
  console.log(`\nspecializer wall time (${times.length} runs): total ${(total / 1000).toFixed(2)} s, median ${at(0.5)} ms, p90 ${at(0.9)} ms, max ${at(1)} ms`);
}
console.log(
  '\n' + ['PASS', 'BLOAT', 'WRONG', 'CRASH', 'UNSUPPORTED', 'SKIP'].map((k) => `${k} ${counts[k] || 0}`).join('  ') + `  (of ${results.length})`,
);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(results, null, 2));
// A test's timers (setInterval in its context) would keep Node running.
process.exit(0);
})();
