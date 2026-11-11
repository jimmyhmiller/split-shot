// inputs: [{"value":[1]}, {"value":[1],"keep":true}, {"value":3}, {"customizer":[1,2],"value":[1]}, {}]
// At a merge of paths, a value held unevaluated that reads a variable's old value (`isCommon = newValue === undefined`) is evaluated before that variable is given the object a path made (`newValue = []`). (From lodash's `baseMergeDeep`.)
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
