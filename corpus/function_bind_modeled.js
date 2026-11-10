// inputs: [0, 1, 3]
// forbid-return: \.name|\.length|plus
// `f.bind(t, ...args)` of a function of known code is modeled: calls fold
// with the bound `this` and arguments first; its `name` and `length` are
// what `bind` made from the function then, whatever the function's are
// later; `new` of it, and the bound function reaching runtime code, behave
// as the real one does.
function main(x) {
  function add(a, b, c) { return (this ? this.base : 0) + a + b + (c || 0); }
  const self = { base: 100 };
  const plus = add.bind(self, x);
  const twice = plus.bind(null, 2);
  const out = [plus(1), plus(1, 2), twice(5), twice.name, plus.length, twice.length];
  Object.defineProperty(add, "name", { value: "renamed", configurable: true });
  out.push(plus.name, add.name);
  function Point(px, py) { this.px = px; this.py = py; }
  const AtX = Point.bind(null, x);
  const p = new AtX(7);
  out.push(p.px, p.py, p instanceof Point);
  globalThis.__plus = plus;
  out.push(globalThis.__plus(4), globalThis.__plus.name, globalThis.__plus.length);
  return out.join("|");
}
