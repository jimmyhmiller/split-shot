// inputs: [{"n":0}, {"n":3}]
// forbid: -[a-z]\b|BigInt\(
// A BigInt constant a residual function captures is given to its body as the constant it is (like a number), so what the body computes of it folds: here `-ONE` in a recursion kept as a residual function.
function main(input) {
  var ONE = BigInt(1);
  function sign(n) { return n <= 0 ? ONE : sign(n - 1) * -ONE; }
  return String(sign(input.n));
}
