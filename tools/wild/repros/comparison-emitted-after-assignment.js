// From lodash-es `merge` (baseMergeDeep: `isCommon = newValue === undefined`
// is computed before `newValue = []`). A miscompile in a fully residual
// function, nothing to do with what is known.
// The comparison is emitted after the assignment it must precede:
//       a = [];
//       c = a === void 0;
//   original: main({"value":[1]}) === "merge into []"
//   residual: "keep []"
// (In lodash: merge({}, {hosts: ["localhost"]}, {}) gives {hosts: []}.)
function main(input) {
  var newValue = input.customizer ? input.customizer.length : void 0;
  var isCommon = newValue === void 0;
  if (Array.isArray(input.value)) {
    if (input.keep) {
      isCommon = false;
      newValue = input.value;
    } else {
      newValue = [];
    }
  }
  if (isCommon) {
    return "merge into " + JSON.stringify(newValue);
  }
  return "keep " + JSON.stringify(newValue);
}
