// inputs: [0, 1, "a", ""]
// forbid: tail-marker[\s\S]*tail-marker
// One arm of a dynamic `if` hands a function to runtime code (it escapes);
// the other does not. The paths still join: the code after the `if` is
// specialized once, not once per arm.
function inc(a) { return a + 1; }
function main(x) {
  var out = "";
  if (x) out = String(Object.prototype.hasOwnProperty.call(inc, String(x)));
  var t = [out.length, "tail-marker"];
  return t.join(":") + inc(2);
}
