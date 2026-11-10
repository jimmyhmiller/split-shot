// inputs: [0, 1, 7, -2]
// Converting an object whose valueOf/toString is the program's own runs that
// code, which reads globals the script set: they must be written before it,
// and each conversion runs in program order.
var base = 10;
var tag = "t";
var ob = { valueOf: function () { return base; }, toString: function () { return tag; } };
function main(n) {
  var o = ob;
  base = n;
  tag = "x" + n;
  var a = 1 + o;
  var b = -o;
  var c = o + "";
  var d = o == n;
  base = 3;
  var e = o * 2;
  return [a, b, c, d, e].join(",");
}
