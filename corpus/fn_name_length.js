// inputs: [0, 3]
// Escaped functions keep their kind, name and length: default and rest
// parameters are left out of length, arrows and methods are not
// constructors, class constructors throw without new, computed literal and
// symbol keys name methods, a non-identifier key is a bracketed member.
function main(x) {
  function f(a, b = 1, ...c) { return a + x; }
  function g(a, b) { return b; }
  const h = (p, {q}, r = 2) => p;
  const k = function () {};
  const obj = { m(a) { return this.v + a + x; }, get z() { return 1; }, v: 5, ["s p"](u) { return u + x; } };
  class C { constructor(a) { this.a = a + x; } }
  const D = class { constructor(a, b) { this.b = b; } };
  let count = x;
  const inc = (d) => (count += d);
  function* gen(a) { yield a + x; }
  const zd = Object.getOwnPropertyDescriptor(obj, "z").get;
  globalThis.keep = [f, g, h, k, obj.m, obj["s p"], C, D, inc, gen, zd];
  const out = globalThis.keep.map(fn => fn.name + "/" + fn.length + "/" + (typeof fn.prototype));
  let threw = "";
  try { C(1); } catch (e) { threw = e instanceof TypeError; }
  let threw2 = "";
  try { new h(1); } catch (e) { threw2 = e instanceof TypeError; }
  return out.join(" ") + " " + threw + " " + threw2 + " " + obj.m(1) + " " + inc(2) + " " + new C(3).a + " " + gen(4).next().value + " " + obj["s p"](7);
}
