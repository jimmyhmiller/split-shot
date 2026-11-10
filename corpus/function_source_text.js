// inputs: [1, 2]
// forbid-return: String\(|holder|keys|`
// A function's string (Function.prototype.toString, the standard one) is
// its source text: a class used as a computed key (Babel's decorator
// output, `static [class X {...}]`), a declaration, an expression, an arrow,
// a method.
function main(x) {
  function f(a, b) { return a + b; }
  const g = function (q) { return q * 2; };
  const arrow = (z) => z + 1;
  const obj = { m(k) { return k; } };
  const holder = new class {
    static [class C { method() { return 1; } }];
  }();
  const keys = Object.keys(holder.constructor);
  return [String(f), g + "", `${arrow}`, String(obj.m), keys.length, typeof keys[0], x].join("\n");
}
