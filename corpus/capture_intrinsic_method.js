// inputs: [{"a": 1, "c": "x"}, {"a": 0, "c": "y"}]
// A closure captures, by value, a const holding an intrinsic method (Object.prototype.toString): the modeled method object is made with the shells, before the closure (LiquidJS's isArray; it was made in the fills, after, and the closure got undefined).
function main(input) {
  const toString = Object.prototype.toString;
  const isArray = (v) => toString.call(v) === "[object Array]";
  class Filter {
    constructor(args) { this.args = args; }
    *render(ctx) { const out = []; for (const a of this.args) out.push(isArray(a) ? a[1] : a); return out.join(",") + ctx; }
  }
  const fs = [new Filter([["k", 1], 2]), new Filter([3])];
  const pick = input.a ? fs[0] : fs[1];
  const g = pick.render(input.c);
  return g.next().value + (fs.length === 2 ? "" : "?");
}
