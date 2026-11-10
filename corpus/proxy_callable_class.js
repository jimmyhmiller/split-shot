// inputs: [0, 1, -2]
// forbid-return: Proxy|bind|callable|Value
// engine262's `@callable()` decorator in miniature: a class wrapped in a
// Proxy whose handler (frozen, no prototype) has only an `apply` trap, so
// calling the class constructs it. Calls, `new`, static members, `extends`,
// `instanceof`, `typeof`, `defineProperty` through the proxy and a bound
// initializer are all modeled.
function main(x) {
  function callable(onCalled = (target, _thisArg, args) => Reflect.construct(target, args)) {
    const handler = Object.freeze({ __proto__: null, apply: onCalled });
    return function decorator(classValue) {
      return new Proxy(classValue, handler);
    };
  }
  class ValueImpl {
    static count = 0;
    constructor(v) { this.v = v; ValueImpl.count += 1; }
    get twice() { return this.v * 2; }
  }
  const Value = callable((_t, _this, [v]) => (typeof v === "number" ? new NumberValue(v) : new ValueImpl(v)))(ValueImpl);
  class NumberValue extends Value {
    constructor(n) { super(n); this.kind = "number"; }
  }
  const meta = Symbol.for("Symbol.metadata");
  Object.defineProperty(Value, meta, { configurable: true, enumerable: true, value: null });
  const init = function (state, f) { state.inits.push(f); }.bind(null, { inits: [] });
  const a = Value(+x);
  const b = Value("s");
  const c = new Value(7);
  const Plain = callable()(class P { constructor(q) { this.q = q; } });
  const d = Plain(x + 1);
  const out = [
    a.v, a.kind, a.twice, a instanceof NumberValue, a instanceof Value, b instanceof NumberValue,
    b.v, c.v, c instanceof Value, ValueImpl.count, Value.count, typeof Value, d.q,
    ValueImpl[meta], typeof init,
  ];
  globalThis.__V = Value;
  globalThis.__a = a;
  out.push(globalThis.__V(3).v, globalThis.__a instanceof globalThis.__V, typeof globalThis.__V);
  return out.join("|");
}
