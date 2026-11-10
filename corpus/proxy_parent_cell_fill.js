// inputs: [0, 1, 5]
// A class extending a proxy, made at runtime from its source: the proxy's
// handler reaches a cell its making fills later. Making the parent aside
// (to name it in `extends`) drained that fill into what it then dropped,
// so the cell stayed empty at runtime (engine262's `Completion`: `x
// instanceof Completion` threw, the cell holding nothing).
const api = (function () {
  let Completion;
  const handler = Object.freeze({ __proto__: null, apply: (_t, _this, [v]) => new Normal(v) });
  class Impl {
    static is(x) { return x instanceof Completion; }
  }
  const P = new Proxy(Impl, handler);
  Completion = P;
  class Normal extends P {
    constructor(v) { super(); this.v = v; }
  }
  function isCompletion(x) { return x instanceof Completion; }
  return { Normal, P, isCompletion };
})();
function main(x) {
  const n = api.P(x);
  globalThis.__api = api;
  return [n.v, api.isCompletion(n), globalThis.__api.isCompletion(globalThis.__api.P(x + 1)), globalThis.__api.P(2).v].join();
}
