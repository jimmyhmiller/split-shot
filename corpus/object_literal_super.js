// inputs: [3, 0, "s"]
// forbid-main: superGet|__proto__
// `super.m()`, `super.v` and `super[k]` in the methods and accessors of an object literal read the prototype of that object, the method's home (not of whatever it is called on), as it is when read; an arrow in the method shares it; a nested literal has its own.
function main(input) {
  var base = { hi() { return "base:" + this.n; }, get v() { return this.n * 2; }, k: "bk" };
  var o = { __proto__: base, n: input, hi() { return "o>" + super.hi(); }, get v() { return super.v + 1; }, pick(key) { return super[key]; },
            inner() { return { __proto__: { hi() { return "deep"; } }, hi() { return super.hi() + "!"; } }.hi(); }, arrow() { return (() => super.hi())(); } };
  var moved = { n: 9, hi: o.hi };
  var later = { n: 1, hi() { return super.hi ? super.hi() : "none"; } };
  var a = later.hi();
  Object.setPrototypeOf(later, base);
  return [o.hi(), o.v, o.pick("k"), o.inner(), o.arrow(), moved.hi(), a, later.hi()];
}
