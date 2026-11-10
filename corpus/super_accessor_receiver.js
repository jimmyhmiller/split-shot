// inputs: [1, 0, -2.5]
// forbid-return: superGet|__pe
// `super.x` reads x from the home object's prototype with the method's
// `this` as the receiver: an inherited getter sees the instance (it used to
// see the prototype, folding these to NaN). Method, computed, static,
// arrow and Object.prototype forms fold too.
function main(x) {
  class A {
    constructor() { this.v = x; }
    get g() { return this.v * 2; }
    m() { return this.v + 100; }
    static get s() { return this.tag; }
  }
  A.tag = "A";
  class B extends A {
    get g() { return super.g + 1; }
    h() { return super.g; }
    k(name) { return super[name](); }
    arrow() { return (() => super.g)(); }
    str() { return super.toString === Object.prototype.toString; }
    static get s() { return "B:" + super.s; }
  }
  B.tag = "b";
  const b = new B();
  return [b.g, b.h(), b.k("m"), b.arrow(), b.str(), B.s].join(",");
}
