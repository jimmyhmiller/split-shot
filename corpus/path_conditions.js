// inputs: [-3, 0, 3, 4, 5, 6, 10, 20, 25]
// forbid: unreachable
// What a branch establishes decides later tests on the same value: x > 5
// implies x > 3; a NaN-able value is not "<= 20" because it is not "> 10";
// x === 0 does not make 1/x known (-0); typeof and == null refine the type.
function classify(x) {
  if (x > 5) {
    if (x > 3) return "big";
    return "unreachable";
  }
  return "small";
}
function nanSafe(v) {
  if (v > 10) return "gt10";
  return (v > 20 ? "unreachable" : "ok") + ":" + (v <= 20);
}
function zero(z) {
  if (z === 0) return 1 / z;
  return z;
}
function kind(v) {
  if (v == null) return "nil";
  if (typeof v === "number") return v == null ? "unreachable" : "num:" + (typeof v);
  return typeof v === "string" ? "str" : "other";
}
function strCmp(s) {
  if (s > "5") return s > "4" ? "gt" : "le";
  return "small";
}
function main(n) {
  var inputs = [n, n / 0 - n / 0, -0 * n, n + "", n > 4 ? null : undefined, n % 2 ? {} : String(n * 3)];
  var out = [];
  for (var i = 0; i < inputs.length; i++) {
    var v = inputs[i];
    out.push(classify(v), nanSafe(v), String(zero(v)), kind(v), strCmp(v));
  }
  return out.join(",");
}
