// style: npm mathjs (expression parsed to a node tree at load, compiled to nested closures, typed-function dispatch)
// residue: "(OperatorNode|FunctionNode|SymbolNode|ConditionalNode|AssignmentNode|FunctionAssignmentNode)"
// mathjs compiling a fixed multi-statement script at load: a recursive
// binomial coefficient, a polynomial, a ternary tier and a sum over the
// input vector. main evaluates the compiled script in a fresh scope.
import { compile } from "mathjs";
const SCRIPT = compile(`
  binom(n, k) = k == 0 or k == n ? 1 : binom(n - 1, k - 1) + binom(n - 1, k);
  poly(x) = 3 x^3 - 2 x^2 + x / 4 - 7;
  total = sum(xs);
  avg = size(xs)[1] > 0 ? total / size(xs)[1] : 0;
  tier = avg > 10 ? "high" : (avg > 0 ? "mid" : "low");
  [binom(n, floor(n / 2)), poly(avg), total, round(avg, 3), mod(n * 7, 5)]
`);
export function main(input) {
  const scope = new Map([["n", input.n], ["xs", input.xs]]);
  const results = SCRIPT.evaluate(scope);
  const last = results.entries[results.entries.length - 1];
  return { values: last.valueOf(), tier: scope.get("tier") };
}
export const inputs = [
  { n: 0, xs: [] },
  { n: 1, xs: [1] },
  { n: 4, xs: [2, 4, 6] },
  { n: 6, xs: [10, 20, 30, 40] },
  { n: 7, xs: [-5, 3.5, 0, 12, 1] },
  { n: 8, xs: [100, 200] },
];
