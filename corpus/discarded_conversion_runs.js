// inputs: [0, 1, 7, -2]
// A discarded `-v;`, `~v;` or `v * 2;` whose operand's type is not known
// still runs: it calls an object's valueOf and throws for a Symbol. Neither
// the specializer nor the cleanup may drop it as an unused value.
var count = 0;
var ob = { valueOf: function () { count++; return 2; } };
function pick(n) {
  if (n > 0) return ob;
  if (n < 0) return Symbol("s");
  return n;
}
function main(n) {
  count = 0;
  var v = pick(n);
  try {
    -v;
  } catch (e) {
    return "threw " + e.name;
  }
  ~v;
  v * 2;
  return "count " + count;
}
