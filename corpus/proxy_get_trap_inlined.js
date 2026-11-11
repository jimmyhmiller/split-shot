// inputs: [{"x":1}, {"x":"q"}]
// forbid-main: new Proxy\(\{a: 5
// A read through a modeled proxy whose `get` trap is a function of known code is the trap's call: the handler as `this`, the target, the key and the proxy (the receiver). Not where the target has the key as a non-configurable property: the engine checks the trap's result against it, so that read is the runtime's.
function main(input) {
  var p = new Proxy({ a: 5 }, { get: function (t, k, r) { return k in t ? t[k] * 2 : "no:" + String(k) + (r === p); } });
  var withDefault = function (o, d) { return new Proxy(o, { get: function (t, k, r) { return Reflect.has(t, k) ? Reflect.get(t, k, r) : d; } }); };
  var c = withDefault({ a: 3 }, 0);
  var frozen = {};
  Object.defineProperty(frozen, "k", { value: 1, writable: false, configurable: false });
  var q = new Proxy(frozen, { get: function () { return 1; } });
  return [p.a, p.zz, c.a, c.b, q.k, input.x];
}
