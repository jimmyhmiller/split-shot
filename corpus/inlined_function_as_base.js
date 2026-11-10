// inputs: [0, 1]
// A function value written where `main` uses it once (not as a separate
// `var`) keeps parentheses where it is a member's base or a callee (the fuzzer
// found `function a2() {...}.push(3);`, a syntax error).
function main(n) {
  var f = function (a, b) { return "k" + n; };
  var g = function () { return 5; };
  try { f.push(3); } catch (e) { n = n + 10; }
  return [g.length, n, typeof f].join(",");
}
