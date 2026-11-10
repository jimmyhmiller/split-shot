// inputs: ["A", "a", 7]
// forbid-main: \["source"\]|\["lastIndex"\]|\.test\(" "\)
// A static key read with brackets on a modeled built-in (a RegExp, a Map) is the property of that name: rollup's CommonJS interop helper keeps engine262's Unicode-table regexes modeled.
function getDefaultExportFromCjs(x) { return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x; }
const space = getDefaultExportFromCjs(/[ \xA0]/);
const m = new Map([["k", 1]]);
function main(input) {
  const re = /[A-Z]/;
  const fixed = [re["source"], re["lastIndex"], m["size"], re["nope"], space.test(" "), space.test("x")];
  return fixed.concat([getDefaultExportFromCjs(re).test(input)]);
}
