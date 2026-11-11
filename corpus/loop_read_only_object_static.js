// inputs: [[], [1, 2, 3], [5]]
// forbid-main: scale|bias|label|= \{
// An object a loop of runtime length only reads stays known across it, whatever its fields are used for (not only when they decide a branch): a read of a field is the field's value, and the object is never made at runtime.
function main(input) {
  var cfg = { scale: 3, bias: 2, label: "sum" };
  var total = 0;
  for (var i = 0; i < input.length; i++) {
    total += input[i] * cfg.scale + cfg.bias;
  }
  return cfg.label + ":" + total;
}
