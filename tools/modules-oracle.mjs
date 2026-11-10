// Node's own answer for a program of modules: load the entry with Node's real
// loader and call its entry function on one input.
//
//   node [node flags] tools/modules-oracle.mjs <entry file> <entry name> <input JSON>
//
// Prints one JSON line: { logs: [...], result } (or { logs, threw }).

import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { show } from './modules-show.mjs';

const [entry, name, inputJson] = process.argv.slice(2);
const logs = [];
console.log = (...a) => logs.push(a.map((x) => (typeof x === 'string' ? x : show(x))).join(' '));
const input = JSON.parse(inputJson);
let out;
try {
  let fn, self;
  if (/\.(cjs|cts)$/.test(entry) || process.env.PE_ORACLE_REQUIRE) {
    // (Loaded as the main module, as `node entry` loads it.)
    const Module = createRequire(import.meta.url)('node:module');
    self = Module._load(entry, null, true);
    fn = self[name];
  } else {
    const ns = await import(pathToFileURL(entry).href);
    if (ns['module.exports'] !== undefined && !(name in ns)) {
      self = ns['module.exports'];
      fn = self[name];
    } else {
      fn = ns[name];
    }
  }
  let r = self ? fn.call(self, input) : fn(input);
  if (r && typeof r.then === 'function') r = await r;
  out = { logs, result: show(r) };
} catch (e) {
  out = { logs, threw: String(e && e.name) + ': ' + String(e && e.message) };
}
// (Let timers and microtasks the program queued run, as the residual's
// runner does.)
await new Promise((r) => setTimeout(r, 20));
out.logs = logs;
process.stdout.write(JSON.stringify(out) + '\n');
