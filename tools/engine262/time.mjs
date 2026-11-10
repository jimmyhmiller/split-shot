// node time.mjs FILE: run FILE's `main` (the original module, or a residual
// script defining a global `main`) on a few inputs, printing each result and
// how long the call took.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';

const file = process.argv[2];
let main;
if (file.endsWith('.mjs')) {
  ({ main } = await import(pathToFileURL(file).href));
} else {
  vm.runInThisContext(readFileSync(file, 'utf8') + '\n;globalThis.__main = main;');
  main = globalThis.__main;
}
for (const x of [5, -2, 0, 1.5, 30, 10]) {
  const t = process.hrtime.bigint();
  const r = main(x);
  console.log(x, String(r), (Number(process.hrtime.bigint() - t) / 1e6).toFixed(2) + 'ms');
}
