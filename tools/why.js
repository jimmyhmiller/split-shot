#!/usr/bin/env node
//
// Reduction scoreboard: what the residual of every program holds, and for
// what cause (the specializer's `--why-json` account, see src/js/why.rs).
//
//   node tools/why.js [--bin path] [--dir corpus] [--json out.json]
//                     [--check | --update] [--top N] [--show REGEX] [filter...]
//
// For each program (a script defining `main(input)`), the units of residual
// work by class:
//   needed   depends on what only the run knows (the input, a host value)
//   merged   a known value a merge of paths made a runtime variable
//   gap      work on known values left to the runtime (an unmodeled
//            built-in, an object handed to one, a limit)
// and, over all of them, the causes ranked by the units each alone holds
// back from being needed work: the list of what to fix, by what it buys.
//
// --check    compare against <dir>/why-baseline.json: exit 1 if any program
//            holds more merged and gap units together than recorded (a
//            reduction that got worse), and list those that hold fewer
// --update   rewrite the baseline with the current counts
// --show RE  list the units behind the causes matching RE (kind and name)
//
// Whether a residual is *correct* is tools/corpus.js's question, not this
// tool's: a program this one cannot specialize is listed and skipped.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
let bin = path.join(root, 'target/release/js-frontend');
let dir = path.join(root, 'corpus');
let jsonOut = null;
let check = false;
let update = false;
let top = 20;
let show = null;
const filters = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--bin') bin = argv[++i];
  else if (argv[i] === '--dir') dir = path.resolve(argv[++i]);
  else if (argv[i] === '--json') jsonOut = argv[++i];
  else if (argv[i] === '--check') check = true;
  else if (argv[i] === '--update') update = true;
  else if (argv[i] === '--top') top = Number(argv[++i]);
  else if (argv[i] === '--show') show = new RegExp(argv[++i]);
  else filters.push(argv[i]);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'why-'));
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.js') || f.endsWith('.ts'))
  .filter((f) => filters.length === 0 || filters.some((x) => f.includes(x)))
  .sort();

const rows = [];
const kinds = new Map();
for (const f of files) {
  const out = path.join(tmp, f + '.json');
  const r = spawnSync(bin, ['--js', '--why-json', out, path.join(dir, f)], { encoding: 'utf8', timeout: 120000 });
  if (r.status !== 0 || !fs.existsSync(out)) {
    const err = ((r.stderr || '') + (r.error ? String(r.error) : '')).trim().split('\n').filter((l) => l && !l.startsWith('note:'));
    rows.push({ file: f, failed: err[err.length - 1] || 'exit ' + r.status });
    continue;
  }
  const w = JSON.parse(fs.readFileSync(out, 'utf8'));
  rows.push({ file: f, ...w.summary });
  w.causes.forEach((c, i) => {
    if (c.class === 'needed' || c.units === 0) return;
    const key = c.class + ' ' + c.kind;
    if (!kinds.has(key)) kinds.set(key, { files: new Set(), reach: 0, sole: 0, whats: new Map() });
    const k = kinds.get(key);
    k.files.add(f);
    k.reach += c.units;
    k.sole += c.sole;
    k.whats.set(c.what, (k.whats.get(c.what) || 0) + c.sole);
    if (show && show.test(c.kind + ' ' + c.what)) {
      console.log(`${f}: ${c.class} ${c.kind} ${c.what} (reaches ${c.units}, alone holds back ${c.sole})`);
      for (const u of w.units.filter((u) => u.causes.includes(i)).slice(0, 6)) {
        console.log(`    ${u.section} ${u.kind}: ${u.text}`);
      }
    }
  });
}
fs.rmSync(tmp, { recursive: true, force: true });

const ok = rows.filter((r) => !r.failed);
const sum = (k) => ok.reduce((a, r) => a + r[k], 0);
if (!show) {
  for (const r of rows.filter((r) => r.failed)) console.log(`SKIP  ${r.file}: ${r.failed}`);
  console.log('causes, by the units each alone holds back:');
  const ranked = [...kinds.entries()].sort((a, b) => b[1].sole - a[1].sole || b[1].reach - a[1].reach);
  for (const [key, k] of ranked) {
    const whats = [...k.whats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w, n]) => `${w} (${n})`).join(', ');
    console.log(`  ${key.padEnd(36)} ${String(k.sole).padStart(5)} alone, reaches ${String(k.reach).padStart(5)}, in ${String(k.files.size).padStart(3)} file(s): ${whats}`);
  }
  console.log(`programs holding the most merged and gap units (of ${ok.length}; ${ok.filter((r) => r.merged + r.gap === 0).length} hold none):`);
  for (const r of [...ok].sort((a, b) => b.merged + b.gap - (a.merged + a.gap)).slice(0, top)) {
    if (r.merged + r.gap === 0) break;
    console.log(`  ${r.file.padEnd(44)} units ${String(r.units).padStart(5)}  merged ${String(r.merged).padStart(4)}  gap ${String(r.gap).padStart(4)}`);
  }
}
const pct = (n) => (sum('units') ? ((100 * n) / sum('units')).toFixed(1) + '%' : '-');
console.log(
  `WHY units ${sum('units')}  needed ${sum('needed')} (${pct(sum('needed'))})  merged ${sum('merged')} (${pct(sum('merged'))})  gap ${sum('gap')} (${pct(sum('gap'))})  (${ok.length} of ${rows.length} program(s))`,
);

if (jsonOut) {
  const causes = [...kinds.entries()].map(([key, k]) => ({ key, files: k.files.size, reach: k.reach, sole: k.sole, whats: Object.fromEntries(k.whats) }));
  fs.writeFileSync(jsonOut, JSON.stringify({ rows, causes }, null, 2));
}

const baselineFile = path.join(dir, 'why-baseline.json');
if (update) {
  const base = {};
  for (const r of ok) base[r.file] = { merged: r.merged, gap: r.gap };
  fs.writeFileSync(baselineFile, JSON.stringify(base, null, 1) + '\n');
  console.log(`baseline written: ${path.relative(root, baselineFile)}`);
}
if (check) {
  if (!fs.existsSync(baselineFile)) {
    console.error(`no baseline at ${baselineFile} (run with --update)`);
    process.exit(1);
  }
  const base = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
  let worse = 0;
  let better = 0;
  for (const r of rows) {
    const b = base[r.file];
    if (!b) continue;
    if (r.failed) {
      console.log(`WORSE   ${r.file}: no longer specializes (${r.failed})`);
      worse++;
    } else if (r.merged + r.gap > b.merged + b.gap) {
      // (Their sum: a unit moving from one class to the other is the same
      // work under a better-known cause.)
      console.log(`WORSE   ${r.file}: merged ${b.merged} -> ${r.merged}, gap ${b.gap} -> ${r.gap}`);
      worse++;
    } else if (r.merged + r.gap < b.merged + b.gap) {
      console.log(`BETTER  ${r.file}: merged ${b.merged} -> ${r.merged}, gap ${b.gap} -> ${r.gap}`);
      better++;
    }
  }
  console.log(`WHY-CHECK worse ${worse}  better ${better}${better && !worse ? '  (run --update to record)' : ''}`);
  if (worse) process.exit(1);
}
