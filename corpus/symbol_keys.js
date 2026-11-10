// inputs: [0, 1, 5]
// forbid-main: typeof|String\(
// `Symbol()` of the standard Symbol makes a symbol: a computed key holding
// one needs no runtime ToPropertyKey test, a global holding one stays
// tracked across it, and keying a fresh object with it changes no built-in.
var s1 = Symbol();
var s2 = Symbol("two");
class K {
  [s1](n) { return n + 1; }
  get [s2]() { return 7; }
}
function main(n) {
  var o = {};
  o[s1] = n;
  return new K()[s1](o[s1]) + new K()[s2];
}
