// inputs: [1, 2]
// forbid-main: \{\s*a:|new Map
// The objects the top-level code makes are made once: each call of `main`
// sees the same ones (`last === config` the second time), and a module
// object it hands out is the one the script holds.
const config = { a: 1, nested: { b: 2 } };
const registry = new Map([["k", config]]);
let last = null;
function main(x) {
  const same = last === config;
  last = config;
  return [same, registry.get("k") === config, config.nested.b + x];
}
