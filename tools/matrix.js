#!/usr/bin/env node
//
// Reduction matrix: language features and built-ins (tools/matrix/features.js)
// crossed with binding-time contexts (tools/matrix/contexts.js). Each cell is
// a tiny generated program: it is specialized, its residual is checked against
// Node on several inputs, and the why report says whether it reduced as the
// context expects.
//
//   node tools/matrix.js [--filter REGEX] [--context NAME] [--json out.json]
//                        [--md docs/REDUCTION-MATRIX.md] [--jobs N] [--keep DIR]
//                        [--strict] [--bin path]
//
// Verdicts:
//   ok           correct, and reduced as the context expects
//   residual     correct, but something is left that should not be (the units
//                and their causes are recorded)
//   wrong        the residual disagrees with Node on some input (or does not
//                load)
//   crash        the specializer panicked, died or timed out
//   unsupported  the front end rejected the program (`error: ...`)
//   n/a          the context makes no sense for the feature
//   bad          the generated program itself is at fault (does not load in
//                Node, is nondeterministic, its known value is not a
//                primitive): a bug in the feature definition, to fix there
//
// Exit status is 0 unless a cell is `wrong`, `crash` or `bad` (`--strict`:
// or `residual`).

const vm = require('node:vm');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const features = require('./matrix/features.js');
const contexts = require('./matrix/contexts.js');

const argv = process.argv.slice(2);
let bin = path.join(root, 'target/release/js-frontend');
let filter = null;
let onlyContext = null;
let jsonOut = null;
let mdOut = null;
let keep = null;
let strict = false;
let jobs = Math.max(1, Math.floor(os.cpus().length / 2));
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--bin') bin = path.resolve(argv[++i]);
  else if (a === '--filter') filter = new RegExp(argv[++i]);
  else if (a === '--context') onlyContext = argv[++i];
  else if (a === '--json') jsonOut = argv[++i];
  else if (a === '--md') mdOut = argv[++i];
  else if (a === '--keep') keep = path.resolve(argv[++i]);
  else if (a === '--jobs') jobs = Math.max(1, Number(argv[++i]) | 0);
  else if (a === '--strict') strict = true;
  else {
    console.error('unknown argument: ' + a);
    process.exit(2);
  }
}
if (onlyContext && !contexts.some((c) => c.name === onlyContext)) {
  console.error(`unknown context: ${onlyContext} (have: ${contexts.map((c) => c.name).join(', ')})`);
  process.exit(2);
}
{
  const seen = new Set();
  for (const f of features) {
    if (seen.has(f.id)) {
      console.error('duplicate feature id: ' + f.id);
      process.exit(2);
    }
    seen.add(f.id);
  }
}

const SPEC_TIMEOUT_MS = 20000;
const RUN_TIMEOUT_MS = 2000;

const INPUTS = [
  { n: 3, s: 'ab', flag: true, list: [1, 2, 3] },
  { n: 0, s: '', flag: false, list: [] },
  { n: -7.5, s: 'Hello, World 42', flag: true, list: [5] },
  { n: 12, s: 'a1b22c', flag: false, list: [4, 3, 2, 1, 0] },
];

// ---------------------------------------------------------------------------
// Running a program in Node.

// A value as text, for comparison: undefined, NaN, -0, holes, bigints and
// property order all show. (Read from outside the context the value was made
// in, so nothing the program did to its own built-ins is in the way.)
function ser(v, seen) {
  switch (typeof v) {
    case 'undefined':
      return 'undefined';
    case 'number':
      return Object.is(v, -0) ? '-0' : String(v);
    case 'string':
      return JSON.stringify(v);
    case 'boolean':
      return String(v);
    case 'bigint':
      return v + 'n';
    case 'symbol':
      return v.toString();
    case 'function':
      return '<function>';
  }
  if (v === null) return 'null';
  seen = seen || [];
  if (seen.includes(v)) return '<cycle>';
  seen = seen.concat([v]);
  try {
    if (Array.isArray(v)) {
      const parts = [];
      for (let i = 0; i < v.length; i++) parts.push(i in v ? ser(v[i], seen) : '<hole>');
      return '[' + parts.join(', ') + ']';
    }
    const tag = Object.prototype.toString.call(v);
    const parts = Object.keys(v).map((k) => JSON.stringify(k) + ': ' + ser(v[k], seen));
    return (tag === '[object Object]' ? '' : tag) + '{' + parts.join(', ') + '}';
  } catch (e) {
    return '<unreadable object>';
  }
}

function thrown(e) {
  if (e && e.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') return 'timeout';
  if (e !== null && (typeof e === 'object' || typeof e === 'function')) {
    let name, message;
    try {
      name = e.name;
      message = e.message;
    } catch (_) {
      return 'throw <unreadable>';
    }
    if (typeof name === 'string' && typeof message === 'string') {
      // (V8 writes the source text of the callee into these messages, names
      // and all: no residual can keep it.)
      const m = message.match(/^.* (is not a function|is not a constructor|is not iterable|is not a function or its return value is not iterable)$/s);
      return `throw ${name}: ${m ? '<expression> ' + m[1] : message}`;
    }
  }
  return 'throw value ' + ser(e);
}

function load(code) {
  const ctx = vm.createContext({});
  try {
    vm.runInContext(code + '\n;globalThis.__main = main;', ctx, { timeout: RUN_TIMEOUT_MS });
  } catch (e) {
    return { loaderr: (e && e.name) + ': ' + (e && e.message) };
  }
  return { ctx };
}

// (The input is made inside the context: its arrays are the context's own.)
function call(ctx, input) {
  try {
    const v = vm.runInContext(`__main(${JSON.stringify(input)})`, ctx, { timeout: RUN_TIMEOUT_MS });
    return { text: ser(v), value: v, isThrow: false };
  } catch (e) {
    return { text: thrown(e), isThrow: true };
  }
}

// What a program does: `main` on each input in a context of its own, then
// `main` on all the inputs in turn, twice over, in one context (a script's
// top-level code runs once, at load).
function observe(code) {
  const fresh = [];
  for (const input of INPUTS) {
    const l = load(code);
    if (l.loaderr) return { loaderr: l.loaderr };
    fresh.push(call(l.ctx, input));
  }
  const l = load(code);
  const repeated = INPUTS.concat(INPUTS).map((input) => call(l.ctx, input).text);
  return { fresh, repeated };
}

// A primitive as source text.
function literal(v) {
  switch (typeof v) {
    case 'undefined':
      return 'undefined';
    case 'number':
      if (Number.isNaN(v)) return 'NaN';
      if (v === Infinity) return 'Infinity';
      if (v === -Infinity) return '(-Infinity)';
      if (Object.is(v, -0)) return '(-0)';
      return v < 0 ? `(${v})` : String(v);
    case 'string':
      return JSON.stringify(v);
    case 'boolean':
      return String(v);
    case 'bigint':
      return v < 0n ? `(${v}n)` : `${v}n`;
  }
  if (v === null) return 'null';
  return null;
}

// ---------------------------------------------------------------------------
// Running the specializer.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function spawnOnce(file, whyFile) {
  return new Promise((resolve) => {
    execFile(
      bin,
      ['--js', '--why-json', whyFile, file],
      { encoding: 'utf8', timeout: SPEC_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024, killSignal: 'SIGKILL' },
      (error, stdout, stderr) => resolve({ error, stdout, stderr }),
    );
  });
}

// A panic as one line: where, and its message (the thread id varies).
function firstLine(s) {
  const lines = (s || '').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('note:'));
  const at = lines.findIndex((l) => /panicked at/.test(l));
  if (at < 0) return lines[0] || '';
  const where = lines[at].replace(/^thread '.*?' (\(\d+\) )?/, '');
  return (where + ' ' + (lines[at + 1] || '')).trim();
}

// A front-end rejection without the syntax tree it prints.
const shortError = (m) => m.replace(/^(unsupported \w+: \w+)\(\w+ \{.*$/s, '$1');

// { residual, report } | { crash } | { unsupported }
async function specialize(file, whyFile) {
  let r;
  // (The binary may be momentarily missing or half written while it is
  // rebuilt: wait for it.)
  for (let attempt = 0; ; attempt++) {
    try {
      fs.rmSync(whyFile, { force: true });
    } catch (_) {}
    r = await spawnOnce(file, whyFile);
    const code = r.error && r.error.code;
    if ((code === 'ENOENT' || code === 'EACCES' || code === 'ETXTBSY' || code === 'ENOEXEC') && attempt < 60) {
      await sleep(2000);
      continue;
    }
    break;
  }
  if (r.error) {
    const e = r.error;
    if (e.killed || e.signal === 'SIGKILL') {
      if (e.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') return { crash: 'residual output over 64 MB' };
      return { crash: `timeout after ${SPEC_TIMEOUT_MS / 1000} s` };
    }
    if (typeof e.code === 'string') return { crash: `could not run the specializer: ${e.code}` };
    const err = r.stderr || '';
    if (e.signal) return { crash: `killed by ${e.signal}: ${firstLine(err)}` };
    if (/panicked|RUST_BACKTRACE|stack overflow/.test(err)) return { crash: firstLine(err) };
    const line = err.split('\n').find((l) => l.startsWith('error:'));
    if (line) return { unsupported: shortError(line.replace(/^error:\s*/, '')) };
    return { crash: `exit ${e.code}: ${firstLine(err)}` };
  }
  const residual = r.stdout.replace(/^--- residual as JavaScript.*\n/, '');
  let report;
  try {
    report = JSON.parse(fs.readFileSync(whyFile, 'utf8'));
  } catch (e) {
    return { crash: 'no readable why report: ' + e.message };
  }
  return { residual, report };
}

// ---------------------------------------------------------------------------
// One cell.

// Why a unit is there, as text that aggregates across cells.
const anon = (s) => s.replace(/\bv\d+\b/g, 'v');

// The operator at the top of an expression's text, if it has one.
function topOperator(text) {
  let t = text;
  const wrapped = (x) => {
    if (x[0] !== '(' || x[x.length - 1] !== ')') return false;
    let depth = 0;
    for (let i = 0; i < x.length; i++) {
      if (x[i] === '"') for (i++; i < x.length && x[i] !== '"'; i++) if (x[i] === '\\') i++;
      if (x[i] === '(') depth++;
      if (x[i] === ')' && --depth === 0) return i === x.length - 1;
    }
    return false;
  };
  while (wrapped(t)) t = t.slice(1, -1);
  let depth = 0;
  let last = null;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (ch === '"') for (i++; i < t.length && t[i] !== '"'; i++) if (t[i] === '\\') i++;
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    if (ch === ')' || ch === ']' || ch === '}') depth--;
    if (depth === 0 && ch === ' ') {
      const m = t.slice(i).match(/^ (\*\*|===|!==|==|!=|<=|>=|<<|>>>|>>|&&|\|\||\?\?|[-+*/%<>&|^]|in|instanceof) /);
      if (m) last = m[1];
    }
  }
  if (last) return last;
  const u = t.match(/^(typeof|void|delete|!|~|-|\+)/);
  return u ? 'unary ' + u[1] : null;
}

// A unit without its operands, so that the same work in different cells is
// the same reason: the callee of a call, the operator of an operation.
function headOf(u) {
  const text = anon(u.text);
  const cut = (s) => (s.length > 60 ? s.slice(0, 57) + '…' : s);
  if ((u.kind === 'call' || u.kind === 'new') && text[text.length - 1] === ')') {
    // The callee: what stands before the last argument list.
    let depth = 0;
    let open = -1;
    for (let i = text.length - 1; i >= 0; i--) {
      if (text[i] === '"') for (i--; i >= 0 && !(text[i] === '"' && text[i - 1] !== '\\'); i--);
      else if (text[i] === ')' || text[i] === ']' || text[i] === '}') depth++;
      else if ((text[i] === '(' || text[i] === '[' || text[i] === '{') && --depth === 0) {
        open = i;
        break;
      }
    }
    if (open > 0) {
      let callee = text.slice(0, open);
      const isNew = callee.startsWith('new ');
      if (isNew) callee = callee.slice(4);
      if (!/^[\w$.]+$/.test(callee)) {
        const m = callee.match(/((?:\.[\w$]+)+)$/);
        callee = m ? '<expression>' + m[1] : '<expression>';
      }
      return `${u.kind} ${isNew ? 'new ' : ''}${callee}(…)`;
    }
  }
  if (u.kind === 'op') {
    const op = topOperator(text);
    if (op) return `op ${op}`;
  }
  return `${u.kind} ${cut(text)}`;
}

// Why a cell's offending units are there, as {kind, what} that aggregate
// across cells. In order of how much they say:
//   - the gap/merged causes the report gives those units;
//   - the causes it classes as needed that are not about the input at all
//     (an impure built-in, an exception, a host name, verbatim source);
//   - a lost unit the report gives no cause for, by its head, unless it only
//     consumes another (its text contains that one's, or it is an operation
//     on a residual value);
//   - failing all of those, the merge causes the report lists without
//     charging any unit to them, and the bare fact that needed units are left.
const GENERIC = new Set(['input', 'carried', 'caller']);
const OWN_NAMES = /^`(out_|i_|r_|t_)` in main$/;
function cellReasons(offenders, report) {
  const out = [];
  const seen = new Set();
  const add = (kind, what) => {
    const k = kind + '\u0000' + what;
    if (!seen.has(k)) {
      seen.add(k);
      out.push({ kind, what });
    }
  };
  const causesOf = (u) => u.causes.map((i) => report.causes[i]).filter(Boolean);
  for (const u of offenders) {
    for (const c of causesOf(u)) {
      if (c.class !== 'needed') add(c.kind, c.what);
      else if (!GENERIC.has(c.kind)) add(`${c.kind} (a cause the report classes as needed)`, c.what);
    }
  }
  const weak = [];
  for (const u of offenders) {
    if (!(u.static || u.class !== 'needed')) continue;
    if (causesOf(u).some((c) => c.class !== 'needed')) continue;
    if (offenders.some((v) => v !== u && (v.static || v.class !== 'needed') && v.text.length < u.text.length && u.text.includes(v.text))) continue;
    // (An operation or a branch on a residual value cannot fold whatever it
    // is: it follows from what left that value. It is a reason only when
    // the report shows nothing before it.)
    if ((u.kind === 'op' || u.kind === 'branch') && /\bv\d+\b|\b__rf\d+\b/.test(u.text)) {
      weak.push(u);
      continue;
    }
    add(u.static ? 'static unit, no cause given' : `${u.class} unit, no cause given`, headOf(u));
  }
  if (out.length === 0) for (const u of weak) add(u.static ? 'static unit, no cause given' : `${u.class} unit, no cause given`, headOf(u));
  if (out.length) return out;
  for (const c of report.causes) {
    if (c.class === 'merged' && c.units === 0 && !OWN_NAMES.test(c.what)) add(`${c.kind} (listed by the report with 0 units; the units left are classed needed)`, c.what);
  }
  const kinds = [...new Set(offenders.flatMap((u) => causesOf(u).map((c) => c.kind)))].sort().join('+') || 'none';
  add(`needed units where nothing depends on the input (causes: ${kinds})`, [...new Set(offenders.map((u) => u.kind))].sort().join(', '));
  return out;
}

// The residual's `main`, when it is plainly `return <literal>;`.
function plainConstantMain(residual) {
  const m = residual.trim().match(/^function main\(\w*\) \{\n {2}return (.*);\n\}$/s);
  if (!m) return false;
  return /^(-?[\d.e+-]+n?|"(?:[^"\\\n]|\\.)*"|true|false|undefined|null|NaN|-?Infinity|void 0)$/.test(m[1]);
}

let workDir = null;
let serial = 0;

function fileBase(f, c) {
  const safe = f.id.replace(/[^A-Za-z0-9_.-]/g, '_');
  return path.join(workDir, `${safe}.${c.name}`);
}

async function runCell(f, c) {
  const cell = { id: f.id, group: f.group, context: c.name };
  if ((f.na || []).includes(c.name)) return { ...cell, verdict: 'n/a', detail: 'marked n/a in the feature definition' };
  const program = c.build(f);
  if (program === null) return { ...cell, verdict: 'n/a', detail: 'the context does not apply' };
  cell.program = program;

  // The original, twice: it must load, and do the same thing both times.
  const a = observe(program);
  if (a.loaderr) return { ...cell, verdict: 'bad', detail: 'original does not load: ' + a.loaderr };
  const a2 = observe(program);
  const textOf = (o) => o.fresh.map((r) => r.text).join(' ; ') + ' ;; ' + o.repeated.join(' ; ');
  if (textOf(a) !== textOf(a2)) return { ...cell, verdict: 'bad', detail: 'original is nondeterministic' };
  if (a.fresh.some((r) => r.text === 'timeout')) return { ...cell, verdict: 'bad', detail: 'original times out' };
  if (a.repeated.join(' ; ') !== a.fresh.concat(a.fresh).map((r) => r.text).join(' ; '))
    return { ...cell, verdict: 'bad', detail: 'original gives different results when main is called again (state outside main)' };
  cell.throws = a.fresh.every((r) => r.isThrow);

  const base = fileBase(f, c) + (keep ? '' : '.' + serial++);
  fs.writeFileSync(base + '.js', program);

  // The baseline of a context that has one: the known value written in.
  let baselineReport = null;
  if (c.baseline) {
    const known = observe(`function main(input) {\n${f.setup ? '  ' + f.setup + '\n' : ''}  return ${f.expr(f.staticArg)};\n}\n`);
    if (known.loaderr) return { ...cell, verdict: 'bad', detail: 'static program does not load: ' + known.loaderr };
    const r0 = known.fresh[0];
    if (r0.isThrow) return { ...cell, verdict: 'n/a', detail: 'the known value is a throw: there is no constant to compare the loop with' };
    const lit = literal(r0.value);
    if (lit === null) return { ...cell, verdict: 'bad', detail: 'the known value is not a primitive: ' + r0.text };
    if (known.fresh.some((r) => r.text !== r0.text)) return { ...cell, verdict: 'bad', detail: 'the known value depends on the input' };
    const baseProgram = c.baseline(f, lit);
    fs.writeFileSync(base + '.baseline.js', baseProgram);
    const b = await specialize(base + '.baseline.js', base + '.baseline.why.json');
    if (b.crash || b.unsupported) {
      return { ...cell, verdict: b.crash ? 'crash' : 'unsupported', detail: 'on the BASELINE program (the loop pushing the constant): ' + (b.crash || b.unsupported), program: baseProgram };
    }
    if (keep) fs.writeFileSync(base + '.baseline.residual.js', b.residual);
    baselineReport = b.report;
  }

  const s = await specialize(base + '.js', base + '.why.json');
  if (s.crash) return { ...cell, verdict: 'crash', detail: s.crash };
  if (s.unsupported) return { ...cell, verdict: 'unsupported', detail: s.unsupported };
  if (keep) fs.writeFileSync(base + '.residual.js', s.residual);
  cell.residual = s.residual;

  // Correct?
  const b = observe(s.residual);
  if (b.loaderr) return { ...cell, verdict: 'wrong', detail: 'residual does not load: ' + b.loaderr, diffs: [] };
  const diffs = [];
  INPUTS.forEach((input, i) => {
    if (a.fresh[i].text !== b.fresh[i].text) diffs.push({ input: JSON.stringify(input), original: a.fresh[i].text, residual: b.fresh[i].text });
  });
  if (diffs.length === 0 && a.repeated.join(' ; ') !== b.repeated.join(' ; ')) {
    INPUTS.concat(INPUTS).forEach((input, i) => {
      if (a.repeated[i] !== b.repeated[i])
        diffs.push({ input: `call #${i + 1} in one loaded context, ${JSON.stringify(input)}`, original: a.repeated[i], residual: b.repeated[i] });
    });
  }
  if (diffs.length) {
    return { ...cell, verdict: 'wrong', detail: `main(${diffs[0].input}): original ${diffs[0].original}, residual ${diffs[0].residual}`, diffs };
  }

  // Reduced?
  const report = s.report;
  cell.summary = report.summary;
  const offenders = c.check({ report, baseline: baselineReport, throws: cell.throws });
  const isConstantContext = ['static', 'helper', 'closure', 'try'].includes(c.name);
  const plain = plainConstantMain(s.residual);
  const notes = [];
  if (isConstantContext && !cell.throws) {
    if (offenders.length === 0 && !plain) notes.push('the report has nothing against it, but the residual is not plainly `function main(a) { return <literal>; }`');
    if (offenders.length > 0 && plain) notes.push('the residual is plainly `return <literal>`, but the report has units');
    if (offenders.length === 0 && report.summary.units > 0) notes.push(`main has no units, but other sections do (${Object.keys(report.sections).join(', ')})`);
  }
  if (report.units.some((u) => u.static && u.class === 'needed')) notes.push('a unit is both `static` and `needed`');
  if (report.units.some((u) => u.class !== 'needed' && !u.static && u.causes.every((i) => report.causes[i].class === 'needed')))
    notes.push('a gap/merged unit has no gap/merged cause and is not static');
  if (notes.length) cell.notes = notes;
  if (offenders.length === 0) return { ...cell, verdict: 'ok' };

  const reasons = cellReasons(offenders, report);
  return {
    ...cell,
    verdict: 'residual',
    reasons,
    units: offenders.slice(0, 6).map((u) => `[${u.section}] ${u.class}${u.static ? '/static' : ''} ${u.kind}: ${u.text}`),
    unitCount: offenders.length,
    detail: reasons.slice(0, 3).map((r) => `${r.kind}${r.what ? ': ' + r.what : ''}`).join('; '),
  };
}

// ---------------------------------------------------------------------------
// The whole matrix.

const VERDICTS = ['ok', 'residual', 'wrong', 'crash', 'unsupported', 'n/a', 'bad'];
const MARK = { ok: '✓', residual: 'R', wrong: 'W!', crash: 'C!', unsupported: 'U', 'n/a': '–', bad: '?!' };

function tally(cells) {
  const t = {};
  for (const v of VERDICTS) t[v] = 0;
  for (const c of cells) t[c.verdict]++;
  return t;
}
const tallyLine = (t, n) =>
  VERDICTS.filter((v) => v !== 'bad' || t.bad)
    .map((v) => `${v} ${t[v]}`)
    .join(' ') + ` (of ${n})`;

function aggregateReasons(cells) {
  // kind -> what -> [cells]
  const kinds = new Map();
  for (const c of cells) {
    if (c.verdict !== 'residual') continue;
    for (const r of c.reasons) {
      if (!kinds.has(r.kind)) kinds.set(r.kind, new Map());
      const whats = kinds.get(r.kind);
      if (!whats.has(r.what)) whats.set(r.what, []);
      whats.get(r.what).push(c);
    }
  }
  return kinds;
}

function flatReasons(cells) {
  const out = [];
  for (const [kind, whats] of aggregateReasons(cells)) {
    for (const [what, cs] of whats) out.push({ kind, what, cells: cs.map((c) => `${c.id}/${c.context}`) });
  }
  out.sort((a, b) => b.cells.length - a.cells.length || (a.kind + a.what < b.kind + b.what ? -1 : 1));
  return out;
}

const mdEscape = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const code = (s) => '`' + String(s).replace(/`/g, 'ˋ') + '`';
const fence = (s, lang) => '```' + (lang || '') + '\n' + s.replace(/\n$/, '') + '\n```';

function markdown(cells, usedContexts, usedFeatures) {
  const by = new Map(cells.map((c) => [c.id + '\u0000' + c.context, c]));
  const out = [];
  const total = tally(cells);
  out.push('# Reduction matrix');
  out.push('');
  out.push(
    'Generated by `node tools/matrix.js --md docs/REDUCTION-MATRIX.md`. Do not edit by hand: change `tools/matrix/features.js` or `tools/matrix/contexts.js` and run it again.',
  );
  out.push('');
  out.push(
    `${usedFeatures.length} features × ${usedContexts.length} binding-time contexts. Each cell is a tiny generated program, specialized by \`js-frontend --js --why-json\`, its residual run against the original in Node on ${INPUTS.length} inputs (each in a fresh context, then all of them twice over in one loaded context), and its why report checked against what the context expects.`,
  );
  out.push('');
  out.push('**' + 'MATRIX ' + tallyLine(total, cells.length) + '**');
  out.push('');
  out.push('## Legend');
  out.push('');
  out.push('| mark | verdict | meaning |');
  out.push('|---|---|---|');
  out.push('| ✓ | ok | correct, and reduced as the context expects |');
  out.push('| R | residual | correct, but something is left that the context says should fold |');
  out.push('| W! | wrong | the residual disagrees with Node on some input: a specializer bug |');
  out.push('| C! | crash | the specializer panicked, died or timed out: a specializer bug |');
  out.push('| U | unsupported | the front end rejected the program |');
  out.push('| – | n/a | the context makes no sense for the feature |');
  if (total.bad) out.push('| ?! | bad | the generated program is at fault: a bug in the feature definition |');
  out.push('');
  out.push('Contexts (`F` is the feature\'s expression, `S`/`S2` known operands, `input` the runtime input):');
  out.push('');
  for (const c of usedContexts) out.push(`- **${c.name}** — ${c.about}`);
  out.push('');
  out.push('Inputs: ' + INPUTS.map((i) => code(JSON.stringify(i))).join(', ') + '.');
  out.push('');

  out.push('## Totals');
  out.push('');
  const shown = VERDICTS.filter((v) => v !== 'bad' || total.bad);
  out.push('| context | ' + shown.join(' | ') + ' |');
  out.push('|---|' + shown.map(() => '--:').join('|') + '|');
  for (const c of usedContexts) {
    const t = tally(cells.filter((x) => x.context === c.name));
    out.push(`| ${c.name} | ` + shown.map((v) => t[v]).join(' | ') + ' |');
  }
  out.push(`| **all** | ` + shown.map((v) => `**${total[v]}**`).join(' | ') + ' |');
  out.push('');
  out.push('| group | features | ' + shown.join(' | ') + ' |');
  out.push('|---|--:|' + shown.map(() => '--:').join('|') + '|');
  const groups = [...new Set(usedFeatures.map((f) => f.group))];
  for (const g of groups) {
    const t = tally(cells.filter((x) => x.group === g));
    out.push(`| ${g} | ${usedFeatures.filter((f) => f.group === g).length} | ` + shown.map((v) => t[v]).join(' | ') + ' |');
  }
  out.push('');

  out.push('## The matrix');
  for (const g of groups) {
    out.push('');
    out.push('### ' + g);
    out.push('');
    out.push('| feature | ' + usedContexts.map((c) => c.name).join(' | ') + ' | expression (operand `x`) |');
    out.push('|---|' + usedContexts.map(() => ':-:').join('|') + '|---|');
    for (const f of usedFeatures.filter((x) => x.group === g)) {
      const marks = usedContexts.map((c) => MARK[by.get(f.id + '\u0000' + c.name).verdict]);
      let e = f.expr('x');
      if (e.length > 90) e = e.slice(0, 87) + '…';
      out.push(`| ${f.id} | ${marks.join(' | ')} | ${mdEscape(code(e))} |`);
    }
  }
  out.push('');

  out.push('## What does not reduce');
  out.push('');
  out.push(
    'Every `residual` cell, by the reason the why report gives for the units that should not be there: the `kind` and `what` of their gap/merged causes; for a unit with no such cause, its text. A cell with several reasons is listed under each.',
  );
  out.push('');
  const kinds = aggregateReasons(cells);
  const kindList = [...kinds.entries()]
    .map(([kind, whats]) => ({ kind, whats, n: new Set([...whats.values()].flat().map((c) => c.id + '/' + c.context)).size }))
    .sort((a, b) => b.n - a.n);
  if (kindList.length === 0) out.push('Nothing: every correct cell reduced.');
  for (const k of kindList) {
    out.push(`### ${k.kind} — ${k.n} cell${k.n === 1 ? '' : 's'}`);
    out.push('');
    const whats = [...k.whats.entries()].sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1));
    for (const [what, cs] of whats) {
      const names = cs.map((c) => `${c.id}/${c.context}`);
      const list = names.length > 14 ? names.slice(0, 14).join(', ') + `, … (${names.length - 14} more)` : names.join(', ');
      out.push(`- ${what ? code(what) : '(unnamed)'} — ${cs.length} cell${cs.length === 1 ? '' : 's'}: ${list}`);
    }
    out.push('');
  }

  const section = (title, verdict, intro) => {
    const cs = cells.filter((c) => c.verdict === verdict);
    out.push(`## ${title} — ${cs.length}`);
    out.push('');
    if (cs.length === 0) {
      out.push('None.');
      out.push('');
      return [];
    }
    if (intro) {
      out.push(intro);
      out.push('');
    }
    return cs;
  };

  for (const c of section('Wrong cells', 'wrong', 'The residual disagrees with the original. Each with its generated program, the residual, and the inputs that differ.')) {
    out.push(`### ${c.id} / ${c.context}`);
    out.push('');
    out.push(mdEscape(c.detail));
    out.push('');
    out.push(fence(c.program, 'js'));
    out.push('');
    out.push('Residual:');
    out.push('');
    const res = c.residual || '';
    const resLines = res.replace(/\n$/, '').split('\n');
    out.push(fence(resLines.length > 40 ? resLines.slice(0, 40).join('\n') + `\n// … (${resLines.length - 40} more lines)` : res, 'js'));
    out.push('');
    if (c.diffs && c.diffs.length) {
      out.push('| input | original | residual |');
      out.push('|---|---|---|');
      for (const d of c.diffs) out.push(`| ${mdEscape(code(d.input))} | ${mdEscape(code(d.original))} | ${mdEscape(code(d.residual))} |`);
      out.push('');
    }
  }
  for (const c of section('Crash cells', 'crash', 'The specializer panicked, died or timed out.')) {
    out.push(`### ${c.id} / ${c.context}`);
    out.push('');
    out.push(code(c.detail));
    out.push('');
    out.push(fence(c.program, 'js'));
    out.push('');
  }
  {
    const cs = section('Unsupported cells', 'unsupported', 'The front end rejected the program. By message:');
    const byMsg = new Map();
    for (const c of cs) {
      if (!byMsg.has(c.detail)) byMsg.set(c.detail, []);
      byMsg.get(c.detail).push(c);
    }
    for (const [msg, list] of [...byMsg.entries()].sort((a, b) => b[1].length - a[1].length)) {
      out.push(`- ${code(msg)} — ${list.length} cell${list.length === 1 ? '' : 's'}: ${list.map((c) => `${c.id}/${c.context}`).join(', ')}`);
    }
    if (cs.length) out.push('');
  }
  for (const c of section('Bad cells', 'bad', 'The generated program is at fault: fix the feature definition.')) {
    out.push(`- ${c.id} / ${c.context}: ${mdEscape(c.detail)}`);
  }
  {
    const cs = cells.filter((c) => c.verdict === 'n/a');
    if (cs.length) {
      out.push(`## n/a cells — ${cs.length}`);
      out.push('');
      for (const c of cs) out.push(`- ${c.id} / ${c.context}: ${mdEscape(c.detail)}`);
      out.push('');
    }
  }
  {
    const cs = cells.filter((c) => c.notes && c.verdict !== 'wrong');
    out.push(`## Report oddities — ${cs.length}`);
    out.push('');
    out.push('Cells where the why report and the residual text do not obviously agree (checked mechanically; the verdict still follows the report).');
    out.push('');
    const byNote = new Map();
    for (const c of cs)
      for (const n of c.notes) {
        if (!byNote.has(n)) byNote.set(n, []);
        byNote.get(n).push(c);
      }
    if (byNote.size === 0) out.push('None.');
    for (const [n, list] of byNote) {
      const names = list.map((c) => `${c.id}/${c.context}`);
      out.push(`- ${n} — ${list.length} cell${list.length === 1 ? '' : 's'}: ${names.length > 20 ? names.slice(0, 20).join(', ') + `, … (${names.length - 20} more)` : names.join(', ')}`);
    }
    out.push('');
  }

  out.push('## Residual cells in detail');
  out.push('');
  out.push('| cell | units over | reasons | first units |');
  out.push('|---|--:|---|---|');
  for (const c of cells.filter((x) => x.verdict === 'residual')) {
    const rs = c.reasons.slice(0, 4).map((r) => `${r.kind}${r.what ? ': ' + r.what : ''}`).join('; ') + (c.reasons.length > 4 ? '; …' : '');
    const us = c.units.slice(0, 3).map((u) => code(u.length > 80 ? u.slice(0, 77) + '…' : u)).join('<br>');
    out.push(`| ${c.id} / ${c.context} | ${c.unitCount} | ${mdEscape(rs)} | ${mdEscape(us)} |`);
  }
  out.push('');
  return out.join('\n');
}

(async () => {
  const usedFeatures = features.filter((f) => !filter || filter.test(f.id) || filter.test(f.group));
  const usedContexts = contexts.filter((c) => !onlyContext || c.name === onlyContext);
  if (usedFeatures.length === 0) {
    console.error('no feature matches the filter');
    process.exit(2);
  }
  if (keep) {
    fs.mkdirSync(keep, { recursive: true });
    workDir = keep;
  } else {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'split-shot-matrix-'));
  }

  const todo = [];
  for (const f of usedFeatures) for (const c of usedContexts) todo.push([f, c]);
  const cells = new Array(todo.length);
  let next = 0;
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= todo.length) return;
      const [f, c] = todo[i];
      try {
        cells[i] = await runCell(f, c);
      } catch (e) {
        cells[i] = { id: f.id, group: f.group, context: c.name, verdict: 'bad', detail: 'harness error: ' + ((e && e.stack) || e) };
      }
    }
  };
  await Promise.all(Array.from({ length: jobs }, worker));
  if (!keep) fs.rmSync(workDir, { recursive: true, force: true });

  // Every cell that is not ok, then the summaries.
  const w = Math.max(...cells.map((c) => (c.id + ' / ' + c.context).length));
  for (const c of cells) {
    if (c.verdict === 'ok' || c.verdict === 'n/a') continue;
    console.log(`${c.verdict.toUpperCase().padEnd(11)} ${(c.id + ' / ' + c.context).padEnd(w)} ${c.detail || ''}`);
  }
  console.log('');
  const groups = [...new Set(usedFeatures.map((f) => f.group))];
  const gw = Math.max(...groups.map((g) => g.length), 7);
  for (const g of groups) {
    const cs = cells.filter((c) => c.group === g);
    console.log(`${g.padEnd(gw)}  ${tallyLine(tally(cs), cs.length)}`);
  }
  console.log('');
  for (const c of usedContexts) {
    const cs = cells.filter((x) => x.context === c.name);
    console.log(`${c.name.padEnd(gw)}  ${tallyLine(tally(cs), cs.length)}`);
  }
  const total = tally(cells);
  console.log('\nMATRIX ' + tallyLine(total, cells.length));

  if (jsonOut) {
    fs.writeFileSync(
      jsonOut,
      JSON.stringify({ summary: total, contexts: usedContexts.map((c) => c.name), inputs: INPUTS, reasons: flatReasons(cells), cells }, null, 2),
    );
  }
  if (mdOut) {
    fs.mkdirSync(path.dirname(path.resolve(mdOut)), { recursive: true });
    fs.writeFileSync(mdOut, markdown(cells, usedContexts, usedFeatures) + '\n');
  }
  const failed = total.wrong + total.crash + total.bad + (strict ? total.residual : 0);
  process.exit(failed ? 1 : 0);
})();
