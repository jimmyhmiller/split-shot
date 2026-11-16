// Evaluate a CommonJS source (as `?raw` text) with the given modules as what
// `require` returns. The second-projection pipeline lives in .cjs files under
// experiments/ and tools/; loading their text this way means the page runs
// exactly those files, not a copy of them.
export function loadCjs(source, modules, filename) {
  const module = { exports: {} };
  const require = (name) => {
    if (Object.hasOwn(modules, name)) return modules[name];
    throw new Error(`${filename}: require(${JSON.stringify(name)}) has no browser module`);
  };
  // (`require.main === module` guards a file's command-line entry point.)
  require.main = undefined;
  Function("module", "exports", "require", source)(module, module.exports, require);
  return module.exports;
}
