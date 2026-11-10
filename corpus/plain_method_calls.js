// inputs: [0, 1, 2, 3]
// forbid-main: \.call\(|\(0, function
// A method call on a runtime value whose method read was snapshotted before
// its arguments ran is written `recv.m(args)` again once cleanup puts the read
// back, and a function passed as an argument or assigned to a member is
// written without `(0, ...)` (nothing names it there).
function main(x) {
  var a = [1, 2, 3, 4].filter(function (v) { return v * x > 2; });
  var o = {};
  o.f = function () { return a.length; };
  return a.reduce(function (s, v) { return s + v; }, 0) + o.f();
}
