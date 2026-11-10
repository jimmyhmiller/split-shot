// inputs: [0, 2, 5]
// after: [Object.getPrototypeOf(globalThis.ExtNull.prototype) === null, Object.getPrototypeOf(globalThis.ExtNull) === Function.prototype, new globalThis.ExtErr("m" ).message].join("|")
// `class C extends null`: the prototype has no parent and the constructor
// keeps Function.prototype (the generic path read null.prototype and threw).
// A non-constructor superclass throws a TypeError at class definition.
function main(n) {
  class Bare extends null {}
  class ExtErr extends Error { constructor(m) { super(m + n); } }
  let threw = "none";
  try { const NotCtor = n; class Bad extends NotCtor {} } catch (e) { threw = e instanceof TypeError; }
  let threw2 = "none";
  try { const P = function () {}; P.prototype = 3; class Bad2 extends P {} } catch (e) { threw2 = e instanceof TypeError; }
  globalThis.ExtNull = Bare;
  globalThis.ExtErr = ExtErr;
  return [Object.getPrototypeOf(Bare.prototype) === null, Object.getPrototypeOf(Bare) === Function.prototype, threw, threw2, new ExtErr("x").message].join("|");
}
