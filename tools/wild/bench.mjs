// How fast `main` runs, loaded as it would be deployed: a process of its
// own, the code in the process's own realm (no `node:vm` context, whose
// global object answers through an interceptor and so slows a script's
// top-level bindings down; see tools/wild.js).
//
//   node bench.mjs <file> <module|script> <jsons.json> <host-globals>
//
// <file> is an ES module exporting `main` (imported) or a script defining a
// global `main` (run in this realm). <jsons.json> holds the inputs as JSON
// strings. <host-globals> are the globals the host gives besides the
// engine's (comma-separated): before the code loads, every other global Node
// adds is removed, so the code runs where it was specialized to run (see
// `--host-globals`). Prints `{"ms": <median milliseconds of one run>,
// "iters": <passes per run>}`: a run is `iters` passes over the inputs,
// after warming up; inputs are parsed before the clock starts.
import fs from "node:fs";
import vm from "node:vm";
import { pathToFileURL } from "node:url";

const [file, kind, jsonsFile, hostList] = process.argv.slice(2);
if (!file || !["module", "script"].includes(kind) || !jsonsFile || hostList === undefined) {
  console.error("usage: node bench.mjs <file> <module|script> <jsons.json> <host-globals>");
  process.exit(2);
}
const jsons = JSON.parse(fs.readFileSync(jsonsFile, "utf8"));
// (What the harness needs of the host, taken before it goes.)
const now = performance.now.bind(performance);
const out = process.stdout;

// The host: the engine's globals (a fresh context's) and the declared ones.
const allowed = new Set([...Object.getOwnPropertyNames(vm.runInNewContext("globalThis")), ...hostList.split(",").filter(Boolean)]);
for (const k of Object.getOwnPropertyNames(globalThis)) {
  if (!allowed.has(k)) {
    try {
      delete globalThis[k];
    } catch {
      // (A non-configurable one stays: none of Node's is.)
    }
  }
}

let main;
if (kind === "module") {
  main = (await import(pathToFileURL(file).href)).main;
} else {
  vm.runInThisContext(fs.readFileSync(file, "utf8"), { filename: file });
  main = globalThis.main;
}
if (typeof main !== "function") throw new Error(`${file} defines no main`);

function build(n) {
  const all = new Array(n * jsons.length);
  for (let i = 0; i < n; i++) for (let j = 0; j < jsons.length; j++) all[i * jsons.length + j] = JSON.parse(jsons[j]);
  return all;
}
function pass(all) {
  let sink = 0;
  for (let i = 0; i < all.length; i++) {
    try {
      if (main(all[i]) !== undefined) sink++;
    } catch {
      sink--;
    }
  }
  return sink;
}
function time(iters) {
  const all = build(iters);
  const t0 = now();
  pass(all);
  return now() - t0;
}

// (One pass cold, to size the runs: about a second each at most.)
const probe = Math.max(time(1), 0.0005);
const iters = Math.max(5, Math.min(2000, Math.floor(1000 / probe)));
pass(build(Math.max(2, Math.floor(iters / 4))));
const times = [];
for (let r = 0; r < 5; r++) times.push(time(iters));
times.sort((a, b) => a - b);
out.write(JSON.stringify({ ms: times[2], iters }) + "\n");
