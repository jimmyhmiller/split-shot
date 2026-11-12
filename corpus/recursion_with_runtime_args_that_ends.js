// inputs: [0, 1, 2, 5, "7", -3, [1, 2], null]
// forbid-main: calculate
// A recursive function called with runtime arguments is unfolded when that
// makes progress: `calculate(n)` of a number returns it, so a calculator over
// a known tree with runtime leaves folds to their arithmetic. One that would
// call itself again with runtime arguments (`fact(n)`, a tree that is all
// runtime, two functions calling each other) stays one residual function.
function calculate(expr) {
  if (typeof expr === "number") return expr;
  switch (expr[0]) {
    case "+": return calculate(expr[1]) + calculate(expr[2]);
    case "-": return calculate(expr[1]) - calculate(expr[2]);
    case "*": return calculate(expr[1]) * calculate(expr[2]);
    case "/": return calculate(expr[1]) / calculate(expr[2]);
  }
}
function fact(n) { return n <= 1 ? 1 : n * fact(n - 1); }
function isEven(n) { return n === 0 ? true : isOdd(n - 1); }
function isOdd(n) { return n === 0 ? false : isEven(n - 1); }
function depth(x) { return Array.isArray(x) ? 1 + Math.max(0, ...x.map(depth)) : 0; }
function main(input) {
  const n = Number(input);
  const k = Math.abs(n) % 6;
  const known = calculate(["+", n, ["*", 2, ["-", n, 3]]]);
  const tree = Array.isArray(input) ? ["+", input[0], input[1]] : ["*", n, n];
  return [known, calculate(tree), fact(k), isEven(k), depth(input), depth([[n], [[n]]])];
}
