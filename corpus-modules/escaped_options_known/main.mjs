// An object a module leaves that `main` hands to runtime code (the
// callbacks a runtime `map` calls close over it) is made once, at load, as
// the module makes it once; runtime code writing nothing, it stays known to
// `main`, which folds what it reads of it before handing it over.
const OPTIONS = { sep: " ", prefix: "btn-", base: ["btn", "btn-rounded"] };
function classes(size, opts) {
  const head = [opts.base.join(" "), opts.base.length];
  const sized = size.split(opts.sep).map((s) => opts.prefix + s);
  return [head, sized];
}
export function main(input) {
  return classes(input, OPTIONS);
}
