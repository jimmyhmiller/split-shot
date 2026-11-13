#!/usr/bin/env node
//
// Cut a program the specializer gets wrong down to a small one that it still
// gets wrong: a line-based delta debugger for what tools/wild.js reports.
//
//   node tools/wild/reduce.cjs FILE --input JSON [--input JSON ...] --got REGEX
//                             [--out FILE] [--bin path] [--stderr REGEX]
//                             [--flag FLAG ...] [--timeout SECONDS] [--budget N]
//
// FILE is a bundle (`bundle.mjs` of a kept wild.js run) or a script defining
// `main`. A candidate is kept while:
//   - the original, on every --input in turn in one loaded context, still
//     gives exactly what the full program gives, and
//   - what the residual gives matches --got (a regex over the outcomes joined
//     by ` ; `, e.g. 'ReferenceError'); or, with --stderr, the specializer
//     fails with a message matching it (for a crash or an unsupported).
// Brace-balanced blocks (whole, their insides, or their wrapping lines) and
// runs of lines are removed until nothing
// more can go. The result is written to --out (default FILE.min.<ext>).

const vm = require('node:vm');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { OBSERVE_SRC } = require('./observe.cjs');

const argv = process.argv.slice(2);
let bin = path.resolve(__dirname, '../../target/release/js-frontend');
let file = null;
let out = null;
let got = null;
let stderrRe = null;
let timeoutS = 20;
let budget = '100M';
const inputs = [];
const flags = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--input') inputs.push(JSON.stringify(JSON.parse(argv[++i])));
  else if (a === '--got') got = new RegExp(argv[++i]);
  else if (a === '--stderr') stderrRe = new RegExp(argv[++i]);
  else if (a === '--out') out = path.resolve(argv[++i]);
  else if (a === '--bin') bin = path.resolve(argv[++i]);
  else if (a === '--flag') flags.push(argv[++i]);
  else if (a === '--timeout') timeoutS = Number(argv[++i]);
  else if (a === '--budget') budget = argv[++i];
  else file = path.resolve(a);
}
if (!file || (!got && !stderrRe) || !inputs.length) {
  console.error('usage: reduce.cjs FILE --input JSON (--got REGEX | --stderr REGEX) [--out FILE]');
  process.exit(2);
}
const ext = path.extname(file);
out = out || file.replace(/(\.[a-z]+)$/, '.min$1');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wild-reduce-'));
const probe = path.join(tmp, 'probe' + ext);

// A module as a script: its exports are just its top-level names.
const asScript = (text) =>
  text
    .replace(/^export\s*\{[^}]*\};?\s*$/gm, '')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+(function|const|let|var|class)\b/gm, '$1');

// (What was thrown, as text: reading a candidate's error may itself throw,
// a `message` getter of the program's that a cut left broken.)
function describe(e) {
  try {
    return String(e && e.name) + ': ' + String(e && e.message);
  } catch (inner) {
    return 'unprintable error';
  }
}

function observe(code) {
  const ctx = vm.createContext({ console: { log() {}, warn() {}, error() {} }, TextEncoder, TextDecoder, URL, setTimeout, clearTimeout, queueMicrotask, structuredClone });
  try {
    vm.runInContext(OBSERVE_SRC, ctx);
    vm.runInContext(code + '\n;globalThis.__wildMain = main;', ctx, { timeout: 5000 });
  } catch (e) {
    return 'loaderr ' + describe(e);
  }
  const outs = [];
  for (const json of inputs) {
    ctx.__wildJson = json;
    try {
      outs.push(vm.runInContext('__wildCall(__wildMain, __wildJson)', ctx, { timeout: 5000 }));
    } catch (e) {
      outs.push('host ' + describe(e));
    }
  }
  return outs.join(' ; ');
}

function specialize(text) {
  fs.writeFileSync(probe, text);
  const r = spawnSync(bin, ['--js', '--budget', budget, ...flags, path.basename(probe)], { cwd: tmp, encoding: 'utf8', timeout: timeoutS * 1000, maxBuffer: 1 << 28, env: { ...process.env, TZ: 'UTC' } });
  if (r.status !== 0) return { failed: (r.stderr || '') + (r.signal ? ' killed by ' + r.signal : '') };
  return { residual: r.stdout.replace(/^--- residual as JavaScript.*\n/, '') };
}

const full = fs.readFileSync(file, 'utf8');
const expected = observe(asScript(full));
let tests = 0;
function interesting(lines) {
  if (pinned(lines) !== pins) return false;
  const text = lines.join('\n') + '\n';
  if (observe(asScript(text)) !== expected) return false;
  tests++;
  const s = specialize(text);
  if (stderrRe) return !!s.failed && stderrRe.test(s.failed);
  if (s.failed) return false;
  const o = observe(s.residual);
  return o !== expected && got.test(o);
}

let lines = full.split('\n').filter((l) => l.trim() !== '' && !/^\s*\/\//.test(l));
// (What makes the file a module with an entry stays.)
const pinned = (ls) => ls.filter((l) => /^export\b/.test(l)).length;
const pins = pinned(lines);
if (!interesting(lines)) {
  const s = specialize(lines.join('\n') + '\n');
  console.error('the full program is not interesting:');
  console.error('  original: ' + expected.slice(0, 400));
  console.error('  residual: ' + (s.failed ? 'specializer failed: ' + s.failed.slice(0, 400) : observe(s.residual).slice(0, 400)));
  process.exit(1);
}
console.error(`original gives: ${expected.slice(0, 300)}`);

// The brace-balanced blocks: [first line, last line] of each run of lines
// that opens more than it closes and the line where that depth comes back.
function blocks(ls) {
  const net = ls.map((l) => {
    let d = 0;
    for (const ch of l) {
      if (ch === '{' || ch === '(' || ch === '[') d++;
      else if (ch === '}' || ch === ')' || ch === ']') d--;
    }
    return d;
  });
  const found = [];
  for (let i = 0; i < ls.length; i++) {
    if (net[i] <= 0) continue;
    let depth = 0;
    for (let j = i; j < ls.length; j++) {
      depth += net[j];
      if (depth <= 0) {
        found.push([i, j]);
        break;
      }
    }
  }
  return found.sort((a, b) => b[1] - b[0] - (a[1] - a[0]));
}

const save = () => fs.writeFileSync(out, lines.join('\n') + '\n');
let changed = true;
while (changed) {
  changed = false;
  // Whole blocks, largest first.
  for (let again = true; again; ) {
    again = false;
    for (const [i, j] of blocks(lines)) {
      // The whole block; else what is inside it; else its first and last
      // lines (what it wraps stays).
      const cands = [lines.slice(0, i).concat(lines.slice(j + 1))];
      if (j > i + 1) {
        cands.push(lines.slice(0, i + 1).concat(lines.slice(j)));
        cands.push(lines.slice(0, i).concat(lines.slice(i + 1, j), lines.slice(j + 1)));
      }
      const cand = cands.find(interesting);
      if (cand) {
        console.error(`  ${cand.length} lines (${lines.length - cand.length} of a block removed, ${tests} tests)`);
        lines = cand;
        changed = again = true;
        save();
        break;
      }
    }
  }
  // Runs of lines, halving.
  for (let n = Math.max(1, lines.length >> 1); n >= 1; n = n >> 1) {
    for (let i = 0; i < lines.length; ) {
      const cand = lines.slice(0, i).concat(lines.slice(i + n));
      if (cand.length < lines.length && interesting(cand)) {
        lines = cand;
        changed = true;
        save();
      } else i += n;
    }
    if (n === 1) break;
  }
  console.error(`  ${lines.length} lines (${tests} tests)`);
}
save();
fs.rmSync(tmp, { recursive: true, force: true });
console.error(`written: ${out} (${lines.length} lines)`);
