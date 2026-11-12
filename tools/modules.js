#!/usr/bin/env node
//
// Programs of modules: link + specialize each case in corpus-modules/ and
// check it against Node's own loader.
//
//   node tools/modules.js [--bin path] [filter...]
//
// A case is a directory with a `case.json`:
//   entry        the entry file (relative to the case)
//   name         the entry's function (default "main")
//   inputs       inputs it is called with (each run is a fresh program)
//   repeat       also load the program once and call it on every input in
//                turn, twice over: what one call leaves, the next sees
//   conditions   package conditions (node --conditions / js-frontend --conditions)
//   node_flags   extra flags for Node's run (e.g. --experimental-transform-types)
//   forbid       a regex the residual must not match (a folding claim)
//   link_error   the linker must refuse the program with a message containing this
//                (and Node must refuse it too, unless \`unsupported\`: true)
//   typescript   Node's run is of the case transpiled by TypeScript itself
//                (tools/ts-oracle: `npm install` there), as tsc would emit it
//
// Each input runs three ways: in Node (tools/modules-oracle.mjs, a fresh
// process), as the linked program before specialization, and as the
// residual. The result and every console.log line must agree.
//
// Verdicts: PASS; LINK-WRONG (the linked program differs from Node: a linker
// bug); WRONG (the residual differs, the linked program agrees: a
// specializer bug); CRASH; BLOAT (a folding claim failed); REFUSED (the
// linker refused a program Node runs).

const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// (A residual that is an ES module exporting `main`, which the specializer
// writes when its code is all strict, loads through `vm.SourceTextModule`:
// Node's `--experimental-vm-modules`, with which this runs itself again.)
if (typeof vm.SourceTextModule !== 'function') {
  const r = spawnSync(process.execPath, ['--experimental-vm-modules', '--no-warnings', __filename, ...process.argv.slice(2)], { stdio: 'inherit' });
  process.exit(r.status === null ? 1 : r.status);
}
const isModule = (code) => /^export (async )?function main\b/m.test(code);

const root = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
let bin = path.join(root, 'target/release/js-frontend');
const filters = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--bin') bin = path.resolve(argv[++i]);
  else filters.push(argv[i]);
}

let showMod;
async function runIn(code, name, input, sequence) {
  const logs = [];
  const sandbox = {
    console: { log: (...a) => logs.push(a.map((x) => (typeof x === 'string' ? x : showMod.show(x))).join(' ')) },
    process,
    setTimeout,
    clearTimeout,
    queueMicrotask,
    URL,
    TextEncoder,
    TextDecoder,
    structuredClone,
  };
  const ctx = vm.createContext(sandbox);
  try {
    if (isModule(code)) {
      const m = new vm.SourceTextModule(code, { context: ctx, identifier: 'residual.mjs' });
      await m.link(() => {
        throw new Error('the residual imports a module');
      });
      await m.evaluate({ timeout: 10000 });
      ctx.__main = m.namespace.main;
    } else {
      vm.runInContext(code + '\n;globalThis.__main = main;', ctx, { timeout: 10000 });
    }
  } catch (e) {
    return { logs, loaderr: String(e && e.name) + ': ' + String(e && e.message) };
  }
  let out;
  if (sequence) {
    const results = [];
    for (const one of input) {
      ctx.__in = JSON.parse(JSON.stringify(one));
      try {
        let r = vm.runInContext('__main(__in)', ctx, { timeout: 10000 });
        if (r && typeof r.then === 'function') r = await r;
        results.push(showMod.show(r));
      } catch (e) {
        results.push('throw ' + String(e && e.name) + ': ' + String(e && e.message));
      }
    }
    out = { logs, result: results.join(' ; ') };
  } else {
    ctx.__in = JSON.parse(JSON.stringify(input));
    try {
      let r = vm.runInContext('__main(__in)', ctx, { timeout: 10000 });
      if (r && typeof r.then === 'function') r = await r;
      out = { logs, result: showMod.show(r) };
    } catch (e) {
      out = { logs, threw: String(e && e.name) + ': ' + String(e && e.message) };
    }
  }
  await new Promise((r) => setTimeout(r, 20));
  out.logs = logs;
  return out;
}

// A copy of case directory `cdir` with each TypeScript file replaced by
// TypeScript's own output for it (ts.transpileModule, per file as tsc emits
// under isolatedModules: imports used only as types elided, enums made,
// relative .ts/.mts/.cts specifiers rewritten): what Node runs for it.
function transpiledCopy(cdir) {
  const ts = require(path.join(__dirname, 'ts-oracle/node_modules/typescript'));
  const out = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'pe-ts-'));
  const walk = (from, to) => {
    fs.mkdirSync(to, { recursive: true });
    for (const e of fs.readdirSync(from, { withFileTypes: true })) {
      const src = path.join(from, e.name);
      if (e.isDirectory()) walk(src, path.join(to, e.name));
      else if (/\.(ts|mts|cts)$/.test(e.name) && !/\.d\.(ts|mts|cts)$/.test(e.name)) {
        const cts = e.name.endsWith('.cts');
        const r = ts.transpileModule(fs.readFileSync(src, 'utf8'), {
          fileName: e.name,
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: cts ? ts.ModuleKind.CommonJS : ts.ModuleKind.ESNext,
            useDefineForClassFields: true,
            rewriteRelativeImportExtensions: true,
            isolatedModules: true,
          },
        });
        fs.writeFileSync(path.join(to, e.name.replace(/\.ts$/, '.js').replace(/\.mts$/, '.mjs').replace(/\.cts$/, '.cjs')), r.outputText);
      } else fs.copyFileSync(src, path.join(to, e.name));
    }
  };
  walk(cdir, out);
  return out;
}

const fmt = (o) => (o.loaderr ? 'loaderr ' + o.loaderr : o.threw !== undefined ? 'throw ' + o.threw : o.result) + (o.logs.length ? '  logs=' + JSON.stringify(o.logs) : '');
const same = (a, b) => fmt(a) === fmt(b);

(async () => {
  showMod = await import(path.join(__dirname, 'modules-show.mjs'));
  const dir = path.join(root, 'corpus-modules');
  const cases = fs
    .readdirSync(dir)
    .filter((d) => fs.existsSync(path.join(dir, d, 'case.json')))
    .filter((d) => filters.length === 0 || filters.some((f) => d.includes(f)))
    .sort();
  const counts = {};
  let bad = 0;
  for (const c of cases) {
    const cdir = path.join(dir, c);
    const spec = JSON.parse(fs.readFileSync(path.join(cdir, 'case.json'), 'utf8'));
    const entry = path.join(cdir, spec.entry);
    const name = spec.name || 'main';
    const args = ['--js'];
    if (name !== 'main') args.push('--entry', name);
    for (const cond of spec.conditions || []) args.push('--conditions', cond);
    args.push(entry);
    const linkedFile = path.join(require('node:os').tmpdir(), `pe-linked-${process.pid}-${c}.js`);
    const t0 = Date.now();
    const r = spawnSync(bin, args, { encoding: 'utf8', timeout: 120000, env: { ...process.env, PE_LINKED_OUT: linkedFile } });
    const ms = Date.now() - t0;
    let verdict = 'PASS';
    const notes = [];
    if (spec.link_error) {
      const err = (r.stderr || '') + (r.stdout || '');
      if (r.status === 0 || !err.includes(spec.link_error)) {
        verdict = 'WRONG';
        notes.push(`expected a link error containing ${JSON.stringify(spec.link_error)}; got status ${r.status}: ${err.split('\n').slice(0, 3).join(' | ')}`);
      }
      // (Node must refuse it too, unless the case says the linker refuses a
      // program Node runs: \`unsupported\`.)
      if (!spec.unsupported) {
        const o = spawnSync(process.execPath, [...(spec.conditions || []).map((x) => `--conditions=${x}`), path.join(__dirname, 'modules-oracle.mjs'), entry, name, '0'], { encoding: 'utf8', cwd: cdir, env: { ...process.env, NODE_NO_WARNINGS: '1' } });
        let want;
        try {
          want = JSON.parse(o.stdout.trim().split('\n').pop());
        } catch {}
        if (!want || want.threw === undefined) {
          verdict = 'WRONG';
          notes.push(`Node runs it: ${want ? fmt(want) : o.stderr.split('\n')[0]}`);
        }
      }
    } else if (r.status !== 0) {
      const err = (r.stderr || '') + (r.error ? String(r.error) : '');
      verdict = /panicked|RUST_BACKTRACE/.test(err) || r.signal ? 'CRASH' : 'REFUSED';
      notes.push(err.split('\n').filter(Boolean).slice(0, 4).join(' | '));
    } else {
      const residual = r.stdout.replace(/^--- residual as JavaScript.*\n/, '');
      fs.writeFileSync(path.join(cdir, '.residual.js'), residual);
      const linked = fs.existsSync(linkedFile) ? fs.readFileSync(linkedFile, 'utf8') : null;
      if (linked) fs.writeFileSync(path.join(cdir, '.linked.js'), linked);
      let oracleEntry = entry;
      let oracleDir = cdir;
      if (spec.typescript) {
        oracleDir = transpiledCopy(cdir);
        oracleEntry = path.join(oracleDir, spec.entry.replace(/\.ts$/, '.js').replace(/\.mts$/, '.mjs').replace(/\.cts$/, '.cjs'));
      }
      // (Each input on a fresh load; and, with `repeat`, all of them on one.)
      const runs = spec.inputs.map((input) => ({ input, sequence: false }));
      if (spec.repeat) runs.push({ input: spec.inputs.concat(spec.inputs), sequence: true });
      for (const { input, sequence } of runs) {
        const o = spawnSync(process.execPath, [...(spec.node_flags || []), ...(spec.conditions || []).map((x) => `--conditions=${x}`), path.join(__dirname, 'modules-oracle.mjs'), oracleEntry, name, JSON.stringify(input)], {
          encoding: 'utf8',
          cwd: oracleDir,
          timeout: 60000,
          env: { ...process.env, NODE_NO_WARNINGS: '1', ...(spec.oracle_require ? { PE_ORACLE_REQUIRE: '1' } : {}), ...(sequence ? { PE_ORACLE_SEQUENCE: '1' } : {}) },
        });
        let want;
        try {
          want = JSON.parse(o.stdout.trim().split('\n').pop());
        } catch {
          verdict = 'CRASH';
          notes.push(`oracle failed on ${JSON.stringify(input)}: ${(o.stderr || '').split('\n').slice(0, 3).join(' | ')}`);
          continue;
        }
        if (linked) {
          const l = await runIn(linked, name, input, sequence);
          if (!same(l, want)) {
            verdict = 'LINK-WRONG';
            notes.push(`${JSON.stringify(input)}: node=${fmt(want)}  linked=${fmt(l)}`);
            continue;
          }
        }
        const got = await runIn(residual, name, input, sequence);
        if (!same(got, want)) {
          if (verdict === 'PASS') verdict = 'WRONG';
          notes.push(`${JSON.stringify(input)}: node=${fmt(want)}  residual=${fmt(got)}`);
        }
      }
      if (verdict === 'PASS' && spec.forbid && new RegExp(spec.forbid).test(residual)) {
        verdict = 'BLOAT';
        notes.push(`residual matches forbid /${spec.forbid}/`);
      }
    }
    try {
      fs.unlinkSync(linkedFile);
    } catch {}
    counts[verdict] = (counts[verdict] || 0) + 1;
    if (verdict !== 'PASS') bad++;
    console.log(`${verdict.padEnd(10)} ${c} (${ms} ms)`);
    for (const n of notes.slice(0, 6)) console.log('    ' + n);
  }
  console.log(Object.entries(counts).map(([k, v]) => `${k} ${v}`).join('  ') + `  (of ${cases.length})`);
  process.exit(bad ? 1 : 0);
})();
