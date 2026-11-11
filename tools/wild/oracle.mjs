// The oracle of tools/wild.js: what Node itself makes of a bundled case.
//
//   node oracle.mjs inputs <case.mjs> <out.json>
//       the case's `inputs` export, as JSON
//   node oracle.mjs run <bundle.mjs> <inputs.json> <out.json>
//       { fresh: [...], repeated: [...] }: `main` on every input, each in a
//       freshly loaded instance of the bundle; then on all the inputs in turn,
//       twice over, in one loaded instance
//
// A process of its own, so nothing a library does to the globals reaches the
// harness or another case.
import fs from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { OBSERVE_SRC } = require("./observe.cjs");
const { __wildCall } = new Function(OBSERVE_SRC + "; return { __wildCall };")();

const [mode, ...rest] = process.argv.slice(2);
if (mode === "inputs") {
  const [casePath, out] = rest;
  const mod = await import(pathToFileURL(casePath).href);
  if (typeof mod.main !== "function") throw new Error("the case does not export a function `main`");
  if (!Array.isArray(mod.inputs)) throw new Error("the case does not export an array `inputs`");
  const text = JSON.stringify(mod.inputs);
  if (JSON.stringify(JSON.parse(text)) !== text) throw new Error("`inputs` does not survive JSON");
  fs.writeFileSync(out, text);
} else if (mode === "run") {
  const [bundle, inputsFile, out] = rest;
  const jsons = JSON.parse(fs.readFileSync(inputsFile, "utf8")).map((v) => JSON.stringify(v));
  const url = pathToFileURL(bundle).href;
  const fresh = [];
  for (let i = 0; i < jsons.length; i++) {
    const mod = await import(url + "?fresh=" + i);
    fresh.push(__wildCall(mod.main, jsons[i]));
  }
  const mod = await import(url + "?repeated");
  const repeated = [];
  for (const json of jsons.concat(jsons)) repeated.push(__wildCall(mod.main, json));
  fs.writeFileSync(out, JSON.stringify({ fresh, repeated }));
} else {
  throw new Error("usage: oracle.mjs inputs|run ...");
}
