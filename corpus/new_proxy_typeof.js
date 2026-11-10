// inputs: [0, 3]
// A Proxy of a function is a function (`typeof`, callable through its
// `apply` trap); `new` of it constructs its target.
function main(n) {
  class C { constructor(v) { this.v = v; } }
  const p = new Proxy(C, { apply(t, _this, args) { return new t(args[0] * 10); } });
  return [typeof p, typeof new Proxy({}, {}), p(n).v, new p(n).v];
}
