// inputs: [1, 5, -2]
// A class constructor reading `super` properties: a method call, an arrow in the constructor calling one, a getter, a computed key, and a three-level chain (split-shot-bugs: LiquidJS error classes call super.update() from constructors; was a lowering error).
class Base { constructor(v) { this.v = v; } get twice() { return this.v * 2; } bump(n) { this.v += n; return this; } static make() { return "base"; } }
class Mid extends Base {
  constructor(v) { super(v); const f = () => super.bump(1); f(); this.t = super.twice; this.k = super["bump"] === Base.prototype.bump; }
  bump(n) { return super.bump(n * 10); }
}
class Leaf extends Mid { constructor(v) { super(v); super.bump(2); this.name = super.constructor.name; } }
function main(input) { const l = new Leaf(input); const m = new Mid(input); return [l.v, l.t, l.k, l.name, m.v, m.t]; }
