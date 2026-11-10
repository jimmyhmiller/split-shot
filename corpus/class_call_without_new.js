// inputs: [0, 1]
// after: [typeof globalThis.callIt === "function" ? callIt() : "none"]
// A class constructor called without `new` throws a TypeError, also once the
// class is a runtime value (an escaped class must stay a class).
class Foo {
  constructor() { Foo.count = (Foo.count || 0) + 1; }
  method(y) { return 10 + y; }
}
globalThis.callIt = function () {
  try { Foo(); return "no throw"; } catch (e) { return e instanceof TypeError ? "TypeError" : "other"; }
};
function main(n) { return new Foo().method(n); }
