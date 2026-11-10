#!/usr/bin/env node
//
// Corpus scoreboard: specialize every program in corpus/ and check it against
// Node.
//
//   node tools/corpus.js [--bin path] [--json out.json] [--no-repeat] [filter...]
//
// Besides one fresh load per input, every program is also loaded once and
// its `main` called on all the inputs in turn, twice over (`--no-repeat`
// skips this): a script's top-level code runs once, at load.
//
// Each corpus file is a plain script defining `main(input)`. Header comments:
//   // inputs: [<JSON values>]     inputs main is called with (required)
//   // async: true                 main's result is awaited (microtasks run) before comparing
//   // after: <expression>         evaluated after main in the same context (runs escaped functions at runtime)
//   // forbid: <regex>             the residual must not match (a folding claim)
//   // forbid-main: <regex>        the residual's `main` must not match (a folding
//                                  claim about main alone: a script's top-level
//                                  declarations stay in the residual as globals)
//   // forbid-return: <regex>      the final top-level `return` of the residual's
//                                  `main` must not match (what main computes
//                                  folded, whatever else main defines)
//   // max-lines: <n>              the residual must have at most n lines
//
// Every file gets one verdict:
//   PASS         residual agrees with the original on every input and meets
//                every folding claim
//   UNSUPPORTED  the front end rejected the program
//   CRASH        the specializer panicked, or the residual failed to load
//   WRONG        the residual disagrees with the original on some input, or
//                over repeated calls
//   BLOAT        correct, but a folding claim failed (forbid / max-lines)
//
// Exit status is 0 only when every file passes.

const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
let bin = path.join(root, 'target/release/js-frontend');
let jsonOut = null;
let noRepeat = false;
const filters = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--bin') bin = argv[++i];
  else if (argv[i] === '--json') jsonOut = argv[++i];
  else if (argv[i] === '--no-repeat') noRepeat = true;
  else filters.push(argv[i]);
}

const TIMEOUT_MS = 2000;

function header(src, key) {
  const m = src.match(new RegExp('^//\\s*' + key + ':\\s*(.*)$', 'm'));
  return m ? m[1].trim() : null;
}

// `main(input)` awaited: its settled value or rejection, after the
// microtask queue has drained.
async function observeAsync(code, input) {
  const sandbox = { console: { log() {} }, TextDecoder, TextEncoder };
  const ctx = vm.createContext(sandbox);
  try {
    vm.runInContext(code + '\n;globalThis.__main = main;', ctx, { timeout: TIMEOUT_MS });
  } catch (e) {
    return { loaderr: String((e && e.message) || e) };
  }
  ctx.__in = JSON.parse(JSON.stringify(input));
  try {
    vm.runInContext(
      'globalThis.__done = false; Promise.resolve(__main(__in)).then((v) => { globalThis.__out = v; globalThis.__done = true; }, (e) => { globalThis.__rejected = String(e && e.message || e); globalThis.__done = true; });',
      ctx,
      { timeout: TIMEOUT_MS },
    );
  } catch (e) {
    return { threw: String(e && e.name) + ': ' + String(e && e.message) };
  }
  for (let i = 0; i < 100 && !ctx.__done; i++) await new Promise((r) => setImmediate(r));
  if (!ctx.__done) return { timeout: true };
  if (ctx.__rejected !== undefined) return { ok: 'rejected: ' + ctx.__rejected };
  return { ok: vm.runInContext('JSON.stringify(__out) === undefined ? "<" + typeof __out + ">" : JSON.stringify(__out)', ctx) };
}

function observe(code, input, after) {
  const sandbox = { console: { log() {} }, TextDecoder, TextEncoder };
  const ctx = vm.createContext(sandbox);
  try {
    vm.runInContext(code + '\n;globalThis.__main = main;', ctx, { timeout: TIMEOUT_MS });
  } catch (e) {
    return { loaderr: String((e && e.message) || e) };
  }
  try {
    ctx.__in = JSON.parse(JSON.stringify(input));
    vm.runInContext('globalThis.__out = __main(__in);', ctx, { timeout: TIMEOUT_MS });
    let out = vm.runInContext(
      'Object.is(__out, -0) ? "-0" : (typeof __out === "number" && !isFinite(__out)) ? String(__out) : JSON.stringify(__out) === undefined ? "<" + typeof __out + ">" : JSON.stringify(__out)',
      ctx,
    );
    if (after) {
      try {
        out += ' | after: ' + JSON.stringify(vm.runInContext(after, ctx, { timeout: TIMEOUT_MS }));
      } catch (e) {
        out += ' | after threw: ' + String((e && e.message) || e);
      }
    }
    return { ok: out };
  } catch (e) {
    if (e && e.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') return { timeout: true };
    // (The error's kind and message count: a residual throwing something
    // else is wrong.)
    return { threw: String(e && e.name) + ': ' + String(e && e.message) };
  }
}

// One context, loaded once, with `main` called on every input in turn,
// twice over: what each call gives, as a list. A script's top-level code
// runs once when it loads, as it would for any caller; whatever main changes
// in the state that code made, the next call sees.
async function observeRepeated(code, inputs, isAsync) {
  const sandbox = { console: { log() {} }, TextDecoder, TextEncoder };
  const ctx = vm.createContext(sandbox);
  try {
    vm.runInContext(code + '\n;globalThis.__main = main;', ctx, { timeout: TIMEOUT_MS });
  } catch (e) {
    return { loaderr: String((e && e.message) || e) };
  }
  const outs = [];
  for (const input of inputs.concat(inputs)) {
    ctx.__in = JSON.parse(JSON.stringify(input));
    try {
      if (isAsync) {
        vm.runInContext(
          'globalThis.__done = false; globalThis.__rejected = undefined; Promise.resolve(__main(__in)).then((v) => { globalThis.__out = v; globalThis.__done = true; }, (e) => { globalThis.__rejected = String(e && e.message || e); globalThis.__done = true; });',
          ctx,
          { timeout: TIMEOUT_MS },
        );
        for (let i = 0; i < 100 && !ctx.__done; i++) await new Promise((r) => setImmediate(r));
        if (!ctx.__done) { outs.push('timeout'); break; }
        if (ctx.__rejected !== undefined) { outs.push('rejected: ' + ctx.__rejected); continue; }
      } else {
        vm.runInContext('globalThis.__out = __main(__in);', ctx, { timeout: TIMEOUT_MS });
      }
      outs.push(vm.runInContext(
        'Object.is(__out, -0) ? "-0" : (typeof __out === "number" && !isFinite(__out)) ? String(__out) : JSON.stringify(__out) === undefined ? "<" + typeof __out + ">" : JSON.stringify(__out)',
        ctx,
      ));
    } catch (e) {
      if (e && e.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') { outs.push('timeout'); break; }
      outs.push('throw ' + String(e && e.name) + ': ' + String(e && e.message));
    }
  }
  return { ok: outs.join(' ; ') };
}

function show(o) {
  if (o.loaderr) return 'loaderr: ' + o.loaderr;
  if (o.timeout) return 'timeout';
  if (o.threw) return 'throw ' + o.threw;
  return o.ok;
}

const dir = path.join(root, 'corpus');
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.js') || f.endsWith('.ts'))
  .filter((f) => filters.length === 0 || filters.some((x) => f.includes(x)))
  .sort();

const results = [];
(async () => {
for (const f of files) {
  const file = path.join(dir, f);
  // (A TypeScript probe runs, for reference, as Node strips its types.)
  const text = fs.readFileSync(file, 'utf8');
  const src = f.endsWith('.ts') ? require('node:module').stripTypeScriptTypes(text) : text;
  const inputsH = header(src, 'inputs');
  if (!inputsH) {
    results.push({ file: f, verdict: 'CRASH', detail: 'missing // inputs: header' });
    continue;
  }
  const inputs = JSON.parse(inputsH);
  const t0 = Date.now();
  const r = spawnSync(bin, ['--js', file], { encoding: 'utf8', timeout: 60000 });
  const ms = Date.now() - t0;
  if (r.status !== 0) {
    const err = (r.stderr || '') + (r.error ? String(r.error) : '');
    const panicked = /panicked|RUST_BACKTRACE/.test(err) || r.signal;
    results.push({
      file: f,
      verdict: panicked ? 'CRASH' : 'UNSUPPORTED',
      detail: err.trim().split('\n').filter((l) => l && !l.startsWith('note:')).slice(-1)[0] || 'exit ' + r.status,
      ms,
    });
    continue;
  }
  const residual = r.stdout.replace(/^--- residual as JavaScript.*\n/, '');
  let verdict = 'PASS';
  let detail = '';
  for (const inp of inputs) {
    const isAsync = header(src, 'async') === 'true';
    const after = header(src, 'after');
    const a = isAsync ? await observeAsync(src, inp) : observe(src, inp, after);
    const b = isAsync ? await observeAsync(residual, inp) : observe(residual, inp, after);
    if (b.loaderr) {
      verdict = 'CRASH';
      detail = 'residual failed to load: ' + b.loaderr;
      break;
    }
    if (show(a) !== show(b)) {
      verdict = 'WRONG';
      detail = `main(${JSON.stringify(inp)}): original ${show(a)}, residual ${show(b)}`;
      break;
    }
  }
  // (Called again and again in one loaded context, as a caller would.)
  if (verdict === 'PASS' && !noRepeat) {
    const isAsync = header(src, 'async') === 'true';
    const a = await observeRepeated(src, inputs, isAsync);
    const b = await observeRepeated(residual, inputs, isAsync);
    if (show(a) !== show(b)) {
      verdict = 'WRONG';
      detail = `repeated calls: original ${show(a)}, residual ${show(b)}`;
    }
  }
  const lines = residual.trim().split('\n').length;
  if (verdict === 'PASS') {
    const forbid = header(src, 'forbid');
    const maxLines = header(src, 'max-lines');
    const forbidMain = header(src, 'forbid-main');
    // (Codegen emits the residual's `main` last.)
    const mainAt = residual.lastIndexOf('\nfunction main(');
    const mainText = mainAt < 0 ? residual : residual.slice(mainAt);
    const forbidReturn = header(src, 'forbid-return');
    const retAt = mainText.lastIndexOf('\n  return ');
    const returnText = retAt < 0 ? '' : mainText.slice(retAt, mainText.indexOf(';\n', retAt) + 1);
    if (forbid && new RegExp(forbid).test(residual)) {
      verdict = 'BLOAT';
      detail = 'residual matches forbidden /' + forbid + '/: ' + residual.match(new RegExp(forbid))[0];
    } else if (forbidReturn && new RegExp(forbidReturn).test(returnText)) {
      verdict = 'BLOAT';
      detail = 'residual main return matches forbidden /' + forbidReturn + '/: ' + returnText.match(new RegExp(forbidReturn))[0];
    } else if (forbidMain && new RegExp(forbidMain).test(mainText)) {
      verdict = 'BLOAT';
      detail = 'residual main matches forbidden /' + forbidMain + '/: ' + mainText.match(new RegExp(forbidMain))[0];
    } else if (maxLines && lines > Number(maxLines)) {
      verdict = 'BLOAT';
      detail = `residual has ${lines} lines (max ${maxLines})`;
    }
  }
  results.push({ file: f, verdict, detail, ms, lines });
}

const counts = {};
for (const r of results) counts[r.verdict] = (counts[r.verdict] || 0) + 1;
const w = Math.max(...results.map((r) => r.file.length), 4);
for (const r of results) {
  console.log(`${r.verdict.padEnd(11)} ${r.file.padEnd(w)} ${r.detail || ''}`);
}
console.log(
  '\n' +
    ['PASS', 'BLOAT', 'WRONG', 'CRASH', 'UNSUPPORTED']
      .map((k) => `${k} ${counts[k] || 0}`)
      .join('  ') +
    `  (of ${results.length})`,
);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(results, null, 2));
process.exit(results.every((r) => r.verdict === 'PASS') ? 0 : 1);
})();
