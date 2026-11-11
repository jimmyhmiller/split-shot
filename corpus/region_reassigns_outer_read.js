// inputs: [{"a":{"v":{"x":1}},"b":{"v":{"x":2}},"flag":true},{"a":{"v":{"x":1}},"b":{"v":null},"flag":true},{"a":{"v":{"x":1}},"flag":false}]
// A function whose try stays residual, inlined before a residual try and again inside it, names its locals the same way both times. A cell holding the first call's result (captured by a closure the inner call cannot reach) is copied out before the try, so it does not read the second call's result after it.
function get(box) {
  let r;
  try {
    r = box.v.x;
  } catch (e) {
    box.v = 0;
    throw e;
  }
  return r;
}
function main(input) {
  var a = get(input.a);
  var read = function () { return a; };
  var b = "none";
  try {
    if (input.flag) b = get(input.b);
  } catch (e) {}
  return read() + ":" + b;
}
