// inputs: ["A", "a"]
// forbid-main: __esModule
// A property a fresh RegExp literal does not have (its only own property is
// lastIndex; RegExp.prototype and Object.prototype are pristine) is
// undefined: the CommonJS-interop helper bundlers wrap imports in folds away.
function main(input) {
  const re = /[A-Z]/;
  function getDefaultExportFromCjs(x) { return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x; }
  return [getDefaultExportFromCjs(re).test(input), re.foo, typeof re.exec, re.source];
}
