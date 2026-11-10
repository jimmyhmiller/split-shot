// inputs: [0, 5]
// A closure inside a binding's own initializer captures the binding before it
// is initialized: it gets a cell (let, const, var, in blocks too).
function main(n) {
  const a = { m() { return a.v; }, v: n };
  var b = { m() { return b.v; }, v: n + 1 };
  let c = () => c.k;
  c.k = n + 2;
  if (n >= 0) { const d = { f() { return d.w; }, w: n + 3 }; globalThis.d = d; }
  globalThis.keep = [a, b, c];
  return [a.m(), b.m(), c(), globalThis.keep[0].m()].join(",");
}
