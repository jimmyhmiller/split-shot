// inputs: [0, 1, 4]
// forbid: unreachable
// A closure made once whose captured bindings are never reassigned is
// specialized with their values (its branches on them fold); instances of
// a function made with other values share its one general form.
function make(flag) {
  return function () {
    return flag ? "on" : "off";
  };
}
function main(n) {
  let off = false;
  let label = "x";
  var once = function () {
    if (off) return "unreachable";
    return label + n;
  };
  var a = make(true), b = make(false), c = make(n > 1);
  return [once(), a(), b(), c()].join(",");
}
