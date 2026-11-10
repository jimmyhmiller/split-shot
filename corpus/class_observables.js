// inputs: [0, 2]
// after: observe()
// An escaped class (emitted as functions and property definitions) looks
// like the class: own property names and descriptors of the class and its
// prototype, methods that are no constructors, statics, accessors.
class Base {
  constructor(v) { this.v = v; }
  get double() { return this.v * 2; }
  set double(x) { this.v = x / 2; }
  inc() { return ++this.v; }
  static make(v) { return new Base(v); }
  static get kind() { return "base"; }
}
class Child extends Base {
  constructor(v) { super(v + 1); }
  inc() { return super.inc() * 10; }
  static make(v) { return new Child(v); }
}
function d(o, k) {
  var x = Object.getOwnPropertyDescriptor(o, k);
  return x ? [typeof x.value, typeof x.get, typeof x.set, x.enumerable, x.writable, x.configurable].join("/") : "none";
}
globalThis.observe = function () {
  var out = [];
  for (var C of [Base, Child]) {
    out.push(Object.getOwnPropertyNames(C).sort().join(","));
    out.push(Object.getOwnPropertyNames(C.prototype).sort().join(","));
    for (var k of ["prototype", "make", "kind", "name", "length"]) out.push(k + ":" + d(C, k));
    for (var k of ["constructor", "inc", "double"]) out.push(k + ":" + d(C.prototype, k));
    try { new C.prototype.inc(); out.push("method constructed"); } catch (e) { out.push(e.constructor.name); }
    try { C(); out.push("called"); } catch (e) { out.push(e.constructor.name); }
    out.push(Object.getPrototypeOf(C) === Function.prototype, Object.getPrototypeOf(C.prototype) === Object.prototype);
  }
  var c = Child.make(3);
  out.push(c.v, c.double, c.inc(), c instanceof Base, Object.keys(c).join(","));
  return out.join(" | ");
};
function main(n) { return Base.make(n).inc() + Child.make(n).double; }
