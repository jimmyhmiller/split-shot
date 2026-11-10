// inputs: [0, 2, 5]
// after: [globalThis.nfe.fact(6), globalThis.nfe.self() === globalThis.nfe.self, globalThis.nfe.fib(10), globalThis.nfe.counter()].join("|")
// A named function expression refers to itself by its own name (recursion,
// identity), the name visible only inside it.
function main(n) {
  const fact = function f(k) { return k <= 1 ? 1 : k * f(k - 1); };
  const self = function me() { return me; };
  const fib = function fib(k) { return k < 2 ? k : fib(k - 1) + fib(k - 2); };
  let calls = 0;
  const counter = function tick() { calls++; return calls < 3 ? tick() : calls; };
  const curry = function c(a) { return function (b) { return b === undefined ? a : c(a + b); }; };
  globalThis.nfe = { fact, self, fib, counter: () => { calls = 0; return counter(); } };
  return [fact(n + 3), self() === self, typeof f, fib(n + 4), counter(), curry(1)(2)(n)()].join("|");
}
