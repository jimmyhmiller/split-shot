// inputs: [0, 2, 5]
// after: [globalThis.more.resid(1, 2), globalThis.more.arrowArgs(4, 5), globalThis.more.capt(3), globalThis.more.spreadRt()].join("|")
// More arguments-object cases: an arrow's `arguments` is the enclosing
// function's; a mapped parameter a closure captures; a function with a try
// (always residual: its arguments object is the native one, mapped by the
// engine itself); `f.apply(this, arguments)` and `...arguments` forwarding;
// a derived class's default constructor forwarding its arguments; spreading
// a runtime iterable.
function main(n) {
  function arrowArgs() { const g = () => arguments[0] + arguments.length; return g(100); }
  function capt(a) { const get = () => a; arguments[0] = a + n; return [get(), a].join(","); }
  function resid(a, b) {
    try { a = a * 10; } catch (e) {}
    return [a, arguments[0], b, arguments.length, arguments.callee === resid].join(",");
  }
  function sum() { var t = 0; for (var i = 0; i < arguments.length; i++) t += arguments[i]; return t; }
  function fwd() { return sum.apply(null, arguments) + sum(...arguments); }
  class Base { constructor(x, y) { this.v = x + y + arguments.length; } }
  class Derived extends Base {}
  function spreadRt() { return [...JSON.parse("[" + n + ", 7]")].join("-"); }
  globalThis.more = { arrowArgs, capt, resid, spreadRt };
  return [arrowArgs(n, 1), capt(2), resid(1, 2), fwd(1, n, 3), new Derived(n, 4).v, spreadRt()].join("|");
}
