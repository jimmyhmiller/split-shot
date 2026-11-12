// style: npm expr-eval (RPN instruction list, switch on instruction type, recursive user functions)
// residue: "I(NUMBER|OP1|OP2|OP3|VAR|VARNAME|FUNCALL|FUNDEF|EXPR|EXPREVAL|MEMBER|ENDSTATEMENT|ARRAY)"
// expr-eval running a fixed formula program, parsed at load: user-defined
// recursive functions (factorial, fibonacci, gcd), map/fold over the input
// list, and a closed-form score.
import { Parser } from "expr-eval";
const SOURCE = `
  fact(k) = k > 1 ? k * fact(k - 1) : 1;
  fib(k) = k < 2 ? k : fib(k - 1) + fib(k - 2);
  gcd(a, b) = b == 0 ? a : gcd(b, a % b);
  sq(v) = v * v;
  add(acc, v) = acc + v;
  [fact(min(n, 12)), fib(min(n, 12)), gcd(n * 6, 84),
   fold(add, 0, map(sq, xs)),
   roundTo(n ^ 2 / 3 + max(1, n) * 0.25, 3),
   n > 10 and length(xs) > 2 ? "big" : "small"]
`;
const EXPR = new Parser().parse(SOURCE);
export function main(input) {
  return EXPR.evaluate({ n: input.n, xs: input.xs });
}
export const inputs = [
  { n: 0, xs: [] },
  { n: 1, xs: [1] },
  { n: 5, xs: [1, 2, 3] },
  { n: 12, xs: [3, 1, 4, 1, 5, 9, 2, 6] },
  { n: 18, xs: [10, 20, 30, 40] },
  { n: 7, xs: [-1, -2, 0.5] },
];
