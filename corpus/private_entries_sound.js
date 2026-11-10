// inputs: [0, 1, 2, 5, -1]
// after: [main(3), main(0)].join(";")
// A class's private entries kept with modeled objects while the class (and
// its stores) are runtime values: an instance escaping after its fields
// were set has them at runtime; `#x in o` sees them; a field set on either
// side of a runtime branch, or in a runtime loop, has its value after; a
// method run at runtime reads what was set at specialization time.
const C = (function () {
  class Counter {
    #n = 0;
    #tag;
    static #made = 0;
    constructor(tag) {
      this.#tag = tag;
      Counter.#made++;
    }
    bump(k) {
      this.#n += k;
      return this;
    }
    get n() {
      return this.#n;
    }
    #secret() {
      return "s:" + this.#tag;
    }
    reveal() {
      return this.#secret();
    }
    static has(o) {
      return #n in o;
    }
    static made() {
      return Counter.#made;
    }
  }
  return Counter;
})();
var keep = [];
function main(x) {
  const a = new C("a");
  a.bump(2);
  const b = new C("b");
  if (x > 1) b.bump(10);
  else b.bump(-1);
  for (let i = 0; i < x; i++) a.bump(i);
  const plain = { n: 1 };
  const out = [a.n, b.n, C.has(a), C.has(plain), a.reveal(), b.reveal()];
  // (The instance reaches runtime code: its fields come with it.)
  keep.push(a);
  out.push(keep[keep.length - 1].n, keep[keep.length - 1].reveal(), C.made() > 0);
  const c = new C("c");
  out.push(c.bump(x).n);
  return out.join(",");
}
