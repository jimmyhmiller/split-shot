// inputs: [1, 5, "s", null]
// forbid-main: Reflect\.|defineProperties|Object\.create|String\.raw
// `Object.defineProperties`, `Object.create` with descriptors, `Reflect`'s functions of an object's properties and `String.raw` are written in JavaScript from the specification and specialized like the program's own code: on known objects they fold, a runtime value among the property values notwithstanding.
function main(input) {
  var out = [];
  var o = Object.defineProperties({}, {
    a: { value: input, enumerable: true },
    b: { get: function () { return this.a; }, configurable: true },
    hidden: { value: 2 },
  });
  out.push(Object.keys(o).join(), o.b, o.hidden, Object.getOwnPropertyDescriptor(o, "a").writable);
  var child = Object.create(o, { c: { value: 3, writable: true, enumerable: true }, d: { value: input } });
  out.push(child.a, child.c, child.d, Object.keys(child).join(), Object.getPrototypeOf(child) === o);
  var t = { x: 1 };
  out.push(Reflect.set(t, "y", input), Reflect.get(t, "y"), Reflect.has(t, "x"), Reflect.has(t, "zz"));
  out.push(Reflect.deleteProperty(t, "x"), "x" in t, Reflect.deleteProperty(t, "never"));
  var frozen = Object.freeze({ k: 1 });
  out.push(Reflect.set(frozen, "k", 2), Reflect.set(frozen, "n", 2), Reflect.defineProperty(frozen, "n", { value: 1 }), Reflect.deleteProperty(frozen, "k"), frozen.k);
  out.push(Reflect.defineProperty(t, "z", { value: input, enumerable: true }), t.z, Reflect.getPrototypeOf(t) === Object.prototype, Reflect.isExtensible(t));
  var setter = { set v(x) { this.got = x; } };
  out.push(Reflect.set(setter, "v", input), setter.got, Reflect.set({ get g() { return 1; } }, "g", 2));
  out.push(Reflect.ownKeys({ b: 1, 1: 2, a: 3 }).join(), Reflect.getOwnPropertyDescriptor(t, "z").enumerable);
  out.push(String.raw({ raw: ["x", "y", "z"] }, input, 7, "ignored"), String.raw({ raw: [] }, 1), String.raw`a\n${input}\tb${1 + 1}`);
  // (A named property of an array defined with attributes: one of its own,
  // kept as defined when the array is a runtime value.)
  var arr = [1, 2];
  Object.defineProperty(arr, "tag", { value: input, enumerable: false });
  Object.defineProperty(arr, "shown", { value: 1, enumerable: true, writable: true, configurable: true });
  out.push(arr.tag, Object.keys(arr).join(), JSON.stringify(Object.getOwnPropertyDescriptor(arr, "tag")), arr.length);
  out.push(Object.getOwnPropertySymbols(arr).length, Object.getOwnPropertySymbols({ a: 1 }).length);
  return [out, arr];
}
