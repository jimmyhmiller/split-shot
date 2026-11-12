#!/usr/bin/env node
//
// JavaScript in the wild: specialize real npm libraries used the way
// applications use them (a fixed configuration, a runtime input) and measure
// what comes out.
//
//   node tools/wild.js [--filter REGEX] [--json out.json] [--md docs/WILD.md]
//                      [--keep DIR] [--timeout SECONDS] [--jobs N]
//                      [--bin path] [--no-time]
//
// The libraries are pinned in tools/wild/package.json (`npm install
// --ignore-scripts` there). A case is an ES module in tools/wild/cases/:
//
//   import { compile } from "path-to-regexp";
//   const toPath = compile("/user/:id");                  // known
//   export function main(input) { return toPath(input); } // runtime
//   export const inputs = [{ id: 1 }, {}];                // JSON values
//
// (`<lib>-<what>.top.mjs` does the fixed work at module top level,
// `<lib>-<what>.inline.mjs` inside `main`.) For each case:
//
//   1. esbuild bundles it into one ES module exporting only `main`, and into
//      one plain script for the timing and the environment check below. No
//      environment is assumed (platform `neutral`); a library that does not
//      bundle that way (it reaches for a Node built-in) is bundled as for a
//      browser (its package's `browser` entry), and if that fails too the
//      case is `skipped`.
//   2. The oracle (tools/wild/oracle.mjs, a Node process of its own) imports
//      the bundle and calls `main` on every input, each in a fresh instance,
//      then on all inputs twice over in one instance. It runs twice: a case
//      that differs from itself is `invalid`. The script form of the original
//      then runs in a bare `node:vm` context, where the residual will run: a
//      case that differs there from Node (it wants `process`, say) is
//      `skipped`, since no residual could be compared fairly.
//   3. `js-frontend --js --budget 100M --host-globals ... --why-json`
//      specializes the bundle, told the globals the context it runs in has
//      besides the engine's (`sandboxGlobals`): any other is absent.
//   4. The residual runs in `node:vm` contexts (a fresh one per input, and
//      one for the repeated calls) and every result, or thrown error by name
//      and message, is compared with the oracle's.
//   5. The `--why-json` account gives the units left and their causes.
//
// Verdicts:
//   ok           the residual agrees with Node on every input and over
//                repeated calls
//   wrong        it disagrees somewhere
//   crash        the specializer panicked, was killed, or timed out; or the
//                residual does not load
//   unsupported  the front end rejected the program (`error: ...`)
//   skipped      the case cannot be bundled without Node built-ins, or does
//                not run the same outside Node
//   invalid      the case itself is broken (not deterministic, no inputs):
//                fix the case
//
// For every `ok` case the residual and the original are also timed
// (indicative only: one machine, one run, a handful of inputs).
//
// This is a measurement, not a gate: the exit status is 0 unless the harness
// itself fails.

const vm = require('node:vm');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const wildDir = path.join(__dirname, 'wild');
const casesDir = path.join(wildDir, 'cases');
const { OBSERVE_SRC } = require(path.join(wildDir, 'observe.cjs'));

const argv = process.argv.slice(2);
let bin = path.join(root, 'target/release/js-frontend');
let filter = null;
let jsonOut = null;
let mdOut = null;
let keep = null;
let timeoutS = 300;
let jobs = 2;
let doTime = true;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--bin') bin = path.resolve(argv[++i]);
  else if (a === '--filter') filter = new RegExp(argv[++i]);
  else if (a === '--json') jsonOut = path.resolve(argv[++i]);
  else if (a === '--md') mdOut = path.resolve(argv[++i]);
  else if (a === '--keep') keep = path.resolve(argv[++i]);
  else if (a === '--timeout') timeoutS = Number(argv[++i]);
  else if (a === '--jobs') jobs = Math.max(1, Number(argv[++i]));
  else if (a === '--no-time') doTime = false;
  else {
    console.error(`unknown argument ${a}`);
    process.exit(2);
  }
}

let esbuild;
try {
  esbuild = require(path.join(wildDir, 'node_modules/esbuild'));
} catch (e) {
  console.error(`esbuild is not installed: run \`npm install --ignore-scripts\` in ${path.relative(process.cwd(), wildDir)} (${e.message})`);
  process.exit(2);
}

// Everything runs as if in UTC: a date library's answer must not depend on
// where the measurement was taken (and the specializer must not disagree with
// the oracle about it).
process.env.TZ = 'UTC';
const childEnv = { ...process.env, TZ: 'UTC' };

const VM_TIMEOUT_MS = 20000;
const work = keep || fs.mkdtempSync(path.join(os.tmpdir(), 'wild-'));
fs.mkdirSync(work, { recursive: true });

const versions = (() => {
  const pkg = JSON.parse(fs.readFileSync(path.join(wildDir, 'package.json'), 'utf8'));
  return { ...pkg.dependencies, ...pkg.devDependencies };
})();

// The specializer as it is right now (another build may replace it while
// this runs: the report says so).
const binStamp = () => {
  try {
    const st = fs.statSync(bin);
    return `${st.size} bytes, built ${st.mtime.toISOString()}`;
  } catch (e) {
    return 'missing';
  }
};
const binAtStart = binStamp();

// ---------------------------------------------------------------- bundling

// How a case is bundled. `neutral` first: no environment assumed, so a
// library reaching for a Node built-in does not bundle. Then as a bundler for
// the browser would (the package's `browser` field and condition, which is
// how such a library says what to use where there is no Node).
const PLATFORMS = {
  neutral: { platform: 'neutral', mainFields: ['module', 'main'], conditions: ['import', 'default'] },
  browser: { platform: 'browser', mainFields: ['browser', 'module', 'main'], conditions: ['browser', 'import', 'default'] },
};

const bundleOptions = (casePath, platform) => ({
  stdin: {
    // (Only `main` is asked for: tree shaking drops the `inputs` export.)
    contents: `export { main } from ${JSON.stringify(casePath)};\n`,
    resolveDir: casesDir,
    sourcefile: 'wild-entry.mjs',
    loader: 'js',
  },
  bundle: true,
  ...PLATFORMS[platform],
  define: { 'process.env.NODE_ENV': '"production"' },
  target: 'es2022',
  write: false,
  logLevel: 'silent',
  legalComments: 'none',
});

async function bundle(casePath, dir) {
  let firstError = null;
  for (const platform of Object.keys(PLATFORMS)) {
    try {
      const esm = await esbuild.build({ ...bundleOptions(casePath, platform), format: 'esm' });
      const iife = await esbuild.build({ ...bundleOptions(casePath, platform), format: 'iife', globalName: '__wildBundle' });
      const esmText = esm.outputFiles[0].text;
      // (The script form defines a global `main`, as a residual does.)
      const scriptText = iife.outputFiles[0].text + '\nvar main = __wildBundle.main;\n';
      fs.writeFileSync(path.join(dir, 'bundle.mjs'), esmText);
      fs.writeFileSync(path.join(dir, 'original.js'), scriptText);
      return { esmText, scriptText, platform };
    } catch (e) {
      firstError = firstError || (e.errors && e.errors[0] && e.errors[0].text) || String(e.message || e).split('\n')[0];
    }
  }
  return { error: firstError };
}

// ---------------------------------------------------------------- observing

// The globals the host gives besides the engine's: the residual runs where
// only these are, and the specializer is told so (`--host-globals`), so a
// library's probe of any other (`typeof process`, `typeof define`) folds.
function sandboxGlobals() {
  return {
    console: { log() {}, warn() {}, error() {}, info() {}, debug() {} },
    setTimeout,
    clearTimeout,
    queueMicrotask,
    URL,
    TextEncoder,
    TextDecoder,
    structuredClone,
  };
}
const HOST_GLOBALS = Object.keys(sandboxGlobals());

function newContext() {
  return vm.createContext(sandboxGlobals());
}

// A script loaded in a fresh context, or why it does not load.
function load(code) {
  const ctx = newContext();
  try {
    // (`WILD_TRACE=1`: see tools/wild/observe.cjs.)
    ctx.__wildTraceEnv = process.env.WILD_TRACE === '1';
    vm.runInContext(OBSERVE_SRC, ctx);
    vm.runInContext(code + '\n;globalThis.__wildMain = main;', ctx, { timeout: VM_TIMEOUT_MS });
  } catch (e) {
    return { loaderr: String(e && e.name) + ': ' + String(e && e.message) };
  }
  return { ctx };
}

function callIn(ctx, json) {
  ctx.__wildJson = json;
  try {
    return vm.runInContext('__wildCall(__wildMain, __wildJson)', ctx, { timeout: VM_TIMEOUT_MS });
  } catch (e) {
    if (e && e.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') return 'timeout';
    // (Not reachable through __wildCall's own catch: a stack overflow in the
    // harness frame, say.)
    return 'host throw ' + String(e && e.name) + ': ' + String(e && e.message);
  }
}

// What a script gives, the way the oracle observes a bundle.
function observeScript(code, jsons) {
  const fresh = [];
  for (const json of jsons) {
    const l = load(code);
    if (l.loaderr) return { loaderr: l.loaderr };
    fresh.push(callIn(l.ctx, json));
  }
  const l = load(code);
  if (l.loaderr) return { loaderr: l.loaderr };
  const repeated = [];
  for (const json of jsons.concat(jsons)) repeated.push(callIn(l.ctx, json));
  return { fresh, repeated };
}

const clip = (s, n = 300) => (s.length > n ? s.slice(0, n) + `… (${s.length} chars)` : s);

// V8 words some TypeErrors with the source text of what was called or read
// (`input.slice is not a function`): a residual, whose locals have other
// names, cannot give that text back. Such a difference is still a difference
// (the verdict is `wrong`), but it is told apart.
const QUOTES_SOURCE = /^throw TypeError: .* is not (a function|iterable|a constructor|a function or its return value is not iterable)$/;
const messageOnly = (expected, got) => {
  const a = expected.match(QUOTES_SOURCE);
  const b = got.match(QUOTES_SOURCE);
  return !!a && !!b && a[1] === b[1];
};

// Where two observations differ: the first place (or null), how many places,
// and whether every one of them is only V8's wording of a TypeError.
function firstDifference(expected, got, jsons) {
  const diffs = [];
  for (let i = 0; i < jsons.length; i++) {
    if (expected.fresh[i] !== got.fresh[i]) {
      diffs.push({ where: 'fresh', input: clip(jsons[i], 200), expected: expected.fresh[i], got: got.fresh[i] });
    }
  }
  for (let i = 0; i < expected.repeated.length; i++) {
    if (expected.repeated[i] !== got.repeated[i]) {
      diffs.push({
        where: `repeated calls (call ${i + 1} of ${expected.repeated.length} in one loaded instance)`,
        input: clip(jsons[i % jsons.length], 200),
        expected: expected.repeated[i],
        got: got.repeated[i],
      });
    }
  }
  if (!diffs.length) return null;
  const first = diffs[0];
  return {
    where: first.where,
    input: first.input,
    expected: clip(first.expected),
    got: clip(first.got),
    count: diffs.length,
    of: jsons.length + expected.repeated.length,
    messageOnly: diffs.every((d) => messageOnly(d.expected, d.got)),
  };
}

function runOracle(args) {
  const r = spawnSync(process.execPath, [path.join(wildDir, 'oracle.mjs'), ...args], { encoding: 'utf8', env: childEnv, timeout: 120000 });
  if (r.status !== 0) {
    const err = ((r.stderr || '') + (r.error ? String(r.error) : '')).trim().split('\n').filter((l) => /Error|error/.test(l));
    return { error: err[0] || 'exit ' + r.status };
  }
  return {};
}

// ---------------------------------------------------------------- specializing

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The specializer on a bundle: its output, exit, wall time and peak memory.
// (`/usr/bin/time -l` reports the peak resident set where it exists.)
async function specialize(dir) {
  // (Another build may be replacing the binary: wait for it to be there.)
  for (let i = 0; i < 60 && !fs.existsSync(bin); i++) await sleep(1000);
  if (!fs.existsSync(bin)) throw new Error(`no specializer at ${bin}`);
  // (`--source-names`: an engine's TypeError quotes the source text of what
  // was called, `input.slice is not a function`.)
  const args = ['--js', '--source-names', '--budget', '100M', '--host-globals', HOST_GLOBALS.join(','), '--why-json', 'why.json', 'bundle.mjs'];
  const timed = process.platform === 'darwin' && fs.existsSync('/usr/bin/time');
  const cmd = timed ? '/usr/bin/time' : bin;
  const cmdArgs = timed ? ['-l', bin, ...args] : args;
  fs.rmSync(path.join(dir, 'why.json'), { force: true });
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn(cmd, cmdArgs, { cwd: dir, env: childEnv, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const out = [];
    const err = [];
    let timedOut = false;
    child.stdout.on('data', (d) => out.push(d));
    child.stderr.on('data', (d) => err.push(d));
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch (e) {
        child.kill('SIGKILL');
      }
    }, timeoutS * 1000);
    child.on('error', (e) => {
      clearTimeout(timer);
      resolve({ status: null, spawnError: String(e), stdout: '', stderr: '', ms: Date.now() - t0 });
    });
    child.on('close', (status, signal) => {
      clearTimeout(timer);
      let stderr = Buffer.concat(err).toString('utf8');
      let rssMb = null;
      if (timed) {
        const m = stderr.match(/^\s*(\d+)\s+maximum resident set size/m);
        if (m) rssMb = Math.round(Number(m[1]) / (1024 * 1024));
        // (Everything from time's own first line on is time's.)
        const at = stderr.search(/^\s*[\d.]+ real\s+[\d.]+ user\s+[\d.]+ sys\s*$/m);
        if (at >= 0) stderr = stderr.slice(0, at);
      }
      resolve({ status, signal, timedOut, stdout: Buffer.concat(out).toString('utf8'), stderr, ms: Date.now() - t0, rssMb });
    });
  });
}

// ---------------------------------------------------------------- one case

const lineCount = (s) => s.trim().split('\n').length;

async function runCase(file) {
  const name = file.replace(/\.mjs$/, '');
  const casePath = path.join(casesDir, file);
  const dir = path.join(work, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const res = { name, lib: name.split(/[-.]/)[0], shape: /\.inline$/.test(name) ? 'inline' : 'top' };

  const inputsFile = path.join(dir, 'inputs.json');
  const got = runOracle(['inputs', casePath, inputsFile]);
  if (got.error) {
    // (A library that only loads with Node's own modules fails here too, but
    // then the bundling below says so; try it first.)
    const b = await bundle(casePath, dir);
    if (b.error) return { ...res, verdict: 'skipped', detail: 'cannot be bundled without Node: ' + b.error };
    return { ...res, verdict: 'invalid', detail: 'the case does not load in Node: ' + got.error };
  }
  const jsons = JSON.parse(fs.readFileSync(inputsFile, 'utf8')).map((v) => JSON.stringify(v));
  res.inputs = jsons.length;
  if (jsons.length < 4) return { ...res, verdict: 'invalid', detail: `only ${jsons.length} inputs (at least 4)` };

  const b = await bundle(casePath, dir);
  if (b.error) return { ...res, verdict: 'skipped', detail: 'cannot be bundled without Node: ' + b.error };
  // (An `inputs` that is not plain literals is code esbuild must keep: it
  // would be specialized with the program.)
  if (/^(var|const|let) inputs\b/m.test(b.esmText)) return { ...res, verdict: 'invalid', detail: '`inputs` is not made of plain literals: the bundle keeps it' };
  res.platform = b.platform;
  res.bundleLines = lineCount(b.esmText);
  res.bundleBytes = b.esmText.length;

  // The oracle, twice.
  const oracleFiles = [path.join(dir, 'oracle.json'), path.join(dir, 'oracle2.json')];
  for (const f of oracleFiles) {
    const r = runOracle(['run', path.join(dir, 'bundle.mjs'), inputsFile, f]);
    if (r.error) return { ...res, verdict: 'invalid', detail: 'the bundle does not load in Node: ' + r.error };
  }
  const oracle = JSON.parse(fs.readFileSync(oracleFiles[0], 'utf8'));
  const again = JSON.parse(fs.readFileSync(oracleFiles[1], 'utf8'));
  fs.rmSync(oracleFiles[1]);
  const unstable = firstDifference(oracle, again, jsons);
  if (unstable) return { ...res, verdict: 'invalid', detail: 'the original differs from itself across two runs', diff: unstable };
  if (oracle.fresh.concat(oracle.repeated).some((s) => s === '<promise>')) {
    return { ...res, verdict: 'invalid', detail: 'main returns a promise' };
  }
  res.throws = oracle.fresh.filter((s) => s.startsWith('throw ')).length;

  // The original where the residual will run.
  const bare = observeScript(b.scriptText, jsons);
  if (bare.loaderr) return { ...res, verdict: 'skipped', detail: 'the original does not load outside Node: ' + bare.loaderr };
  const envDiff = firstDifference(oracle, bare, jsons);
  if (envDiff) return { ...res, verdict: 'skipped', detail: 'the original runs differently outside Node', diff: envDiff };

  const s = await specialize(dir);
  res.ms = s.ms;
  res.rssMb = s.rssMb;
  if (s.spawnError) throw new Error(`cannot run ${bin}: ${s.spawnError}`);
  const errLines = s.stderr.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('note:'));
  fs.writeFileSync(path.join(dir, 'stderr.txt'), s.stderr);
  if (s.timedOut) return { ...res, verdict: 'crash', detail: `timeout after ${timeoutS} s` + (errLines[0] ? ': ' + clip(errLines[0]) : '') };
  if (s.status !== 0) {
    const panicAt = errLines.findIndex((l) => /panicked at/.test(l));
    if (panicAt >= 0) {
      return { ...res, verdict: 'crash', detail: clip(errLines.slice(panicAt, panicAt + 2).join(' ')) };
    }
    const error = errLines.find((l) => /^error:/.test(l));
    if (error && s.status !== null) return { ...res, verdict: 'unsupported', detail: clip(error, 400) };
    return { ...res, verdict: 'crash', detail: clip(`${s.signal ? 'killed by ' + s.signal : 'exit ' + s.status}: ${errLines[0] || '(nothing on stderr)'}`) };
  }
  const residual = s.stdout.replace(/^--- residual as JavaScript.*\n/, '');
  fs.writeFileSync(path.join(dir, 'residual.js'), residual);
  res.residualLines = lineCount(residual);
  res.residualBytes = residual.length;

  // The account of what was left.
  const whyFile = path.join(dir, 'why.json');
  if (fs.existsSync(whyFile)) {
    const w = JSON.parse(fs.readFileSync(whyFile, 'utf8'));
    res.why = w.summary;
    // What a call of `main` can run: everything but what runs once, at load.
    const run = { units: 0, needed: 0, merged: 0, gap: 0 };
    for (const [section, c] of Object.entries(w.sections || {})) {
      if (section === 'load') {
        res.load = c;
        continue;
      }
      for (const k of Object.keys(run)) run[k] += c[k];
    }
    res.run = run;
    res.causes = w.causes
      .filter((c) => c.class !== 'needed' && c.units > 0)
      .map((c) => ({ class: c.class, kind: c.kind, what: c.what, units: c.units, sole: c.sole }));
  }

  const after = observeScript(residual, jsons);
  if (after.loaderr) return { ...res, verdict: 'crash', detail: 'the residual does not load: ' + clip(after.loaderr) };
  const diff = firstDifference(oracle, after, jsons);
  if (diff) {
    const note = diff.messageOnly ? ' [only the wording of a TypeError that quotes source text]' : '';
    return { ...res, verdict: 'wrong', detail: `${diff.where}: main(${diff.input}), ${diff.count} of ${diff.of} calls differ${note}`, diff };
  }
  return { ...res, verdict: 'ok', detail: '' };
}

// ---------------------------------------------------------------- timing

// Milliseconds per pass over the inputs, original and residual, each loaded
// in a context of its own in this process. The number of passes is cut down
// for a case whose passes are slow.
function timeCase(res) {
  const dir = path.join(work, res.name);
  // (Only the inputs `main` returns for: one it throws for measures the
  // engine wording its error, which for a TypeError that quotes the call
  // (`x.f is not a function`) parses the function the call is in again, and
  // so costs by that function's size.)
  const fresh = JSON.parse(fs.readFileSync(path.join(dir, 'oracle.json'), 'utf8')).fresh;
  const jsons = JSON.parse(fs.readFileSync(path.join(dir, 'inputs.json'), 'utf8'))
    .map((v) => JSON.stringify(v))
    .filter((_, i) => !String(fresh[i]).startsWith('throw '));
  if (jsons.length === 0) throw new Error('main throws for every input');
  const measure = (code, warm, iters, runs) => {
    const l = load(code);
    if (l.loaderr) throw new Error('does not load: ' + l.loaderr);
    l.ctx.__wildJsons = jsons;
    l.ctx.__wildNow = () => performance.now();
    return vm.runInContext(`__wildTime(__wildMain, __wildJsons, ${warm}, ${iters}, ${runs}, __wildNow)`, l.ctx);
  };
  const original = fs.readFileSync(path.join(dir, 'original.js'), 'utf8');
  const residual = fs.readFileSync(path.join(dir, 'residual.js'), 'utf8');
  // (One pass of each, cold, to size the loops: about a second per run at most.)
  const probe = Math.max(measure(original, 1, 1, 1), measure(residual, 1, 1, 1), 0.0005);
  const iters = Math.max(5, Math.min(2000, Math.floor(1000 / probe)));
  const warm = Math.max(2, Math.floor(iters / 4));
  const a = measure(original, warm, iters, 5);
  const b = measure(residual, warm, iters, 5);
  return { iters, inputs: jsons.length, originalUs: (a / iters) * 1000, residualUs: (b / iters) * 1000, ratio: b / a };
}

// ---------------------------------------------------------------- reporting

const pctOf = (n, d) => (d ? ((100 * n) / d).toFixed(0) + '%' : '-');
const VERDICTS = ['ok', 'wrong', 'crash', 'unsupported', 'skipped'];

function aggregate(results) {
  const ok = results.filter((r) => r.verdict === 'ok' && r.causes);
  const byWhat = new Map();
  const byKind = new Map();
  for (const r of ok) {
    for (const c of r.causes) {
      for (const [map, key] of [[byWhat, `${c.class}\t${c.kind}\t${c.what}`], [byKind, `${c.class}\t${c.kind}\t`]]) {
        if (!map.has(key)) map.set(key, { class: c.class, kind: c.kind, what: map === byWhat ? c.what : '', sole: 0, reach: 0, cases: new Set(), whats: new Map() });
        const e = map.get(key);
        e.sole += c.sole;
        e.reach += c.units;
        e.cases.add(r.name);
        e.whats.set(c.what, (e.whats.get(c.what) || 0) + c.sole);
      }
    }
  }
  const rank = (m) => [...m.values()].sort((a, b) => b.sole - a.sole || b.reach - a.reach).map((e) => ({
    class: e.class,
    kind: e.kind,
    what: e.what,
    sole: e.sole,
    reach: e.reach,
    cases: e.cases.size,
    examples: [...e.whats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([w, n]) => `${w} (${n})`),
  }));
  const grouped = new Map();
  for (const r of results.filter((r) => r.verdict === 'unsupported')) {
    if (!grouped.has(r.detail)) grouped.set(r.detail, []);
    grouped.get(r.detail).push(r.name);
  }
  const sum = (f) => ok.reduce((a, r) => a + f(r), 0);
  return {
    byWhat: rank(byWhat),
    byKind: rank(byKind),
    unsupported: [...grouped.entries()].sort((a, b) => b[1].length - a[1].length).map(([message, cases]) => ({ message, cases })),
    totals: {
      cases: ok.length,
      units: sum((r) => r.why.units),
      needed: sum((r) => r.why.needed),
      merged: sum((r) => r.why.merged),
      gap: sum((r) => r.why.gap),
      runUnits: sum((r) => r.run.units),
      runNeeded: sum((r) => r.run.needed),
      bundleLines: sum((r) => r.bundleLines),
      residualLines: sum((r) => r.residualLines),
    },
  };
}

const fmtRatio = (t) => (t ? t.ratio.toFixed(2) + 'x' : '-');
const fmtUs = (us) => (us >= 100 ? us.toFixed(0) : us >= 1 ? us.toFixed(1) : us.toFixed(2));

function summaryLine(results) {
  const counts = {};
  for (const r of results) counts[r.verdict] = (counts[r.verdict] || 0) + 1;
  return (
    'WILD ' +
    VERDICTS.map((k) => `${k} ${counts[k] || 0}`).join(' ') +
    (counts.invalid ? ` invalid ${counts.invalid}` : '') +
    ` (of ${results.length})`
  );
}

function printReport(results, agg) {
  console.log('');
  console.log(summaryLine(results));
  const t = agg.totals;
  if (t.cases) {
    console.log(
      `over the ${t.cases} ok case(s): units ${t.units}, needed ${t.needed} (${pctOf(t.needed, t.units)}), merged ${t.merged} (${pctOf(t.merged, t.units)}), gap ${t.gap} (${pctOf(t.gap, t.units)}); ` +
        `outside load: units ${t.runUnits}, needed ${pctOf(t.runNeeded, t.runUnits)}; residual lines ${t.residualLines} for ${t.bundleLines} bundle lines`,
    );
  }
  console.log('\ncauses over the ok cases, by the units each alone holds back (kind + what):');
  for (const c of agg.byWhat.slice(0, 40)) {
    console.log(`  ${String(c.sole).padStart(6)} alone, reaches ${String(c.reach).padStart(7)}, in ${String(c.cases).padStart(2)} case(s)  ${c.class} ${c.kind}  ${clip(c.what, 100)}`);
  }
  console.log('\ncauses over the ok cases, by kind:');
  for (const c of agg.byKind) {
    console.log(`  ${String(c.sole).padStart(6)} alone, reaches ${String(c.reach).padStart(7)}, in ${String(c.cases).padStart(2)} case(s)  ${c.class} ${c.kind}: ${clip(c.examples.join(', '), 160)}`);
  }
  console.log('\nunsupported, grouped:');
  for (const u of agg.unsupported) console.log(`  ${u.cases.length} case(s): ${u.message}\n      ${u.cases.join(', ')}`);
  for (const v of ['wrong', 'crash', 'skipped', 'invalid']) {
    const rs = results.filter((r) => r.verdict === v);
    if (!rs.length) continue;
    console.log(`\n${v}:`);
    for (const r of rs) {
      console.log(`  ${r.name}: ${r.detail}`);
      if (r.diff) console.log(`      ${r.diff.where}, input ${r.diff.input}\n      expected ${r.diff.expected}\n      got      ${r.diff.got}`);
    }
  }
  const timed = results.filter((r) => r.timing).sort((a, b) => a.timing.ratio - b.timing.ratio);
  if (timed.length) {
    console.log('\nrun time of the residual over the original (indicative only; below 1 is faster):');
    for (const r of timed) {
      console.log(`  ${fmtRatio(r.timing).padStart(8)}  ${r.name.padEnd(34)} ${fmtUs(r.timing.originalUs).padStart(8)} -> ${fmtUs(r.timing.residualUs).padStart(8)} us per pass over ${r.timing.inputs} inputs`);
    }
    const logs = timed.map((r) => Math.log(r.timing.ratio));
    console.log(`  geometric mean ${Math.exp(logs.reduce((a, b) => a + b, 0) / logs.length).toFixed(2)}x over ${timed.length} case(s); faster (<0.9x) ${timed.filter((r) => r.timing.ratio < 0.9).length}, slower (>1.1x) ${timed.filter((r) => r.timing.ratio > 1.1).length}`);
  }
}

function markdown(results, agg) {
  const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const code = (s) => '`' + String(s).replace(/`/g, "'") + '`';
  const out = [];
  out.push('# JavaScript in the wild');
  out.push('');
  out.push('> Generated by `node tools/wild.js --md docs/WILD.md`. Do not edit: run it again.');
  out.push('');
  out.push(
    'Real npm libraries (pinned in `tools/wild/package.json`), used the way applications use them: a fixed configuration and a runtime input. ' +
      'Each case in `tools/wild/cases/` is bundled by esbuild into one ES module, specialized with `js-frontend --js --budget 100M`, and its residual compared with Node on every input ' +
      '(a fresh load per input, and all inputs twice over in one loaded instance; results as JSON, thrown errors by name and message).',
  );
  out.push('');
  out.push('```');
  out.push(summaryLine(results));
  out.push('```');
  out.push('');
  out.push(`Specializer: \`${agg.bin.path}\` (${agg.bin.atStart})` + (agg.bin.changed ? `. **It was rebuilt while this ran** (${agg.bin.atEnd} at the end): the cases were not all measured on the same build.` : '.'));
  out.push('');
  const t = agg.totals;
  if (t.cases) {
    out.push(
      `Over the ${t.cases} ok case(s): ${t.units} residual units, ${pctOf(t.needed, t.units)} needed, ${pctOf(t.merged, t.units)} merged, ${pctOf(t.gap, t.units)} gap. ` +
        `Outside the load section: ${t.runUnits} units, ${pctOf(t.runNeeded, t.runUnits)} needed. ${t.residualLines} residual lines for ${t.bundleLines} bundle lines.`,
    );
    out.push('');
  }
  out.push('## Cases');
  out.push('');
  out.push('`run units` are the residual units outside the `load` section (what calls of `main` can run), `needed` the share of them that depends on the input. `run time` is the residual over the original (below 1 is faster; indicative only). `wrong (wording)`: the only difference is the text of a TypeError in which V8 quotes the source (`input.slice is not a function`), which a residual with other local names cannot give back.');
  out.push('');
  out.push('| case | verdict | bundled for | bundle lines | residual lines | units | run units | needed | spec. time | peak RSS | run time |');
  out.push('|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|');
  for (const r of results) {
    out.push(
      `| ${r.name} | ${r.verdict}${r.diff && r.diff.messageOnly ? ' (wording)' : ''} | ${r.platform ?? '-'} | ${r.bundleLines ?? '-'} | ${r.residualLines ?? '-'} | ${r.why ? r.why.units : '-'} | ${r.run ? r.run.units : '-'} | ${r.run ? pctOf(r.run.needed, r.run.units) : '-'} | ${r.ms != null ? (r.ms / 1000).toFixed(1) + ' s' : '-'} | ${r.rssMb != null ? r.rssMb + ' MB' : '-'} | ${r.timing ? fmtRatio(r.timing) : '-'} |`,
    );
  }
  out.push('');
  out.push('## Causes');
  out.push('');
  out.push('Over the ok cases: why known values were left to the runtime, ranked by the units each cause alone holds back (`sole`).');
  out.push('');
  out.push('| sole | reaches | cases | class | kind | what |');
  out.push('|--:|--:|--:|---|---|---|');
  for (const c of agg.byWhat.slice(0, 40)) out.push(`| ${c.sole} | ${c.reach} | ${c.cases} | ${c.class} | ${c.kind} | ${esc(clip(c.what, 120))} |`);
  out.push('');
  out.push('By kind:');
  out.push('');
  out.push('| sole | reaches | cases | class | kind | most of it |');
  out.push('|--:|--:|--:|---|---|---|');
  for (const c of agg.byKind) out.push(`| ${c.sole} | ${c.reach} | ${c.cases} | ${c.class} | ${c.kind} | ${esc(clip(c.examples.join(', '), 200))} |`);
  out.push('');
  out.push('## Unsupported');
  out.push('');
  if (!agg.unsupported.length) out.push('None.');
  for (const u of agg.unsupported) out.push(`- ${u.cases.length} case(s): ${code(u.message)}\n  - ${u.cases.join(', ')}`);
  out.push('');
  for (const [v, title] of [['wrong', 'Wrong'], ['crash', 'Crash'], ['skipped', 'Skipped'], ['invalid', 'Invalid']]) {
    const rs = results.filter((r) => r.verdict === v);
    if (!rs.length && (v === 'skipped' || v === 'invalid')) continue;
    out.push(`## ${title}`);
    out.push('');
    if (!rs.length) out.push('None.');
    for (const r of rs) {
      out.push(`- **${r.name}**: ${code(r.detail)}`);
      if (r.diff) {
        out.push(`  - ${r.diff.where}, input ${code(r.diff.input)}`);
        out.push(`  - expected ${code(r.diff.expected)}`);
        out.push(`  - got ${code(r.diff.got)}`);
      }
    }
    out.push('');
  }
  const timed = results.filter((r) => r.timing).sort((a, b) => a.timing.ratio - b.timing.ratio);
  if (timed.length) {
    out.push('## Run time');
    out.push('');
    out.push(
      'Indicative only. `main` over the inputs of the case it returns for (one it throws for measures the engine wording its error), the original bundle and the residual each loaded as a script in a `node:vm` context of the same process: ' +
        'up to 2000 passes after a quarter as many to warm up, the median of 5 runs. One machine, one run, a handful of inputs.',
    );
    out.push('');
    out.push('| case | original (us/pass) | residual (us/pass) | residual / original |');
    out.push('|---|--:|--:|--:|');
    for (const r of timed) out.push(`| ${r.name} | ${fmtUs(r.timing.originalUs)} | ${fmtUs(r.timing.residualUs)} | ${fmtRatio(r.timing)} |`);
    out.push('');
    const logs = timed.map((r) => Math.log(r.timing.ratio));
    out.push(`Geometric mean ${Math.exp(logs.reduce((a, b) => a + b, 0) / logs.length).toFixed(2)}x over ${timed.length} case(s); ${timed.filter((r) => r.timing.ratio < 0.9).length} faster (below 0.9x), ${timed.filter((r) => r.timing.ratio > 1.1).length} slower (above 1.1x).`);
    out.push('');
  }
  out.push('## Libraries');
  out.push('');
  out.push(Object.entries(versions).map(([k, v]) => `${k} ${v}`).join(', ') + '.');
  out.push('');
  return out.join('\n');
}

// ---------------------------------------------------------------- main

(async () => {
  const files = fs
    .readdirSync(casesDir)
    .filter((f) => f.endsWith('.mjs'))
    .filter((f) => !filter || filter.test(f))
    .sort();
  if (!files.length) {
    console.error('no cases match');
    process.exit(2);
  }
  const width = Math.max(...files.map((f) => f.length - 4));
  const results = new Array(files.length);
  let next = 0;
  const line = (r) =>
    `${r.verdict.padEnd(11)} ${r.name.padEnd(width)} ` +
    (r.verdict === 'ok'
      ? `lines ${r.bundleLines} -> ${r.residualLines}, units ${r.why.units} (run ${r.run.units}, needed ${pctOf(r.run.needed, r.run.units)}), ${(r.ms / 1000).toFixed(1)} s` + (r.rssMb != null ? `, ${r.rssMb} MB` : '')
      : r.detail);
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= files.length) return;
      results[i] = await runCase(files[i]);
      console.log(line(results[i]));
    }
  };
  await Promise.all(Array.from({ length: Math.min(jobs, files.length) }, worker));

  // (Timed one at a time, once nothing else is running.)
  if (doTime) {
    for (const r of results.filter((r) => r.verdict === 'ok')) {
      try {
        r.timing = timeCase(r);
      } catch (e) {
        r.timingError = String((e && e.message) || e);
      }
    }
  }

  const agg = aggregate(results);
  agg.bin = { path: path.relative(root, bin), atStart: binAtStart, atEnd: binStamp() };
  agg.bin.changed = agg.bin.atStart !== agg.bin.atEnd;
  printReport(results, agg);
  if (agg.bin.changed) console.log(`\nNOTE: the specializer was rebuilt while this ran (${agg.bin.atStart} -> ${agg.bin.atEnd}): cases were not all measured on the same build.`);
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ summary: summaryLine(results), versions, results, aggregate: agg }, null, 2));
  if (mdOut) fs.writeFileSync(mdOut, markdown(results, agg));
  if (!keep) fs.rmSync(work, { recursive: true, force: true });
  await esbuild.stop?.();
  process.exit(0);
})().catch((e) => {
  console.error('wild.js failed: ' + ((e && e.stack) || e));
  process.exit(2);
});
