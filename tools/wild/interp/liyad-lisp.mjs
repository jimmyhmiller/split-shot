// style: npm liyad (Lisp S-expression interpreter: list evaluation, symbol lookup in scope chains, operator tables)
// residue: \bresolve(Function|Value)Symbol
// liyad's `lisp` running a fixed Lisp program at load: it defines the tarai
// (Takeuchi) function and a doubly recursive fibonacci, and returns a lambda
// that main calls (each call is interpreted by liyad): tarai of the list's
// length, fib, the sum of squares of the list and the elements above two.
import { lisp } from "liyad";
const run = lisp`
($defun tarai (x y z)
  ($if (<= x y)
    y
    (tarai (tarai (- x 1) y z) (tarai (- y 1) z x) (tarai (- z 1) x y))))
($defun fib (n)
  ($if (< n 2) n (+ (fib (- n 1)) (fib (- n 2)))))
(-> (input)
  ($let n ($get input "n"))
  ($let xs ($get input "xs"))
  ($list
    (tarai ($length xs) 2 0)
    (fib n)
    ($reduce ($map xs (-> (x) (* x x))) (-> (acc v) (+ acc v)) 0)
    ($filter xs (-> (x) (> x 2)))))
`;
export function main(input) {
  return run(input);
}
export const inputs = [
  { n: 0, xs: [] },
  { n: 1, xs: [5] },
  { n: 3, xs: [1, 2, 3] },
  { n: 5, xs: [4, -4, 0, 2.5] },
  { n: 7, xs: [9, 8, 7, 1] },
  { n: 8, xs: [1, 1, 2, 3, 5] },
];
