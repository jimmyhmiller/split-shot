// inputs: ["k", "__proto__", "toString", "zz", "constructor", "hasOwnProperty", "m", "0", ""]
// A string key known only at runtime, read from a choice of objects: each
// object's own data properties are compared with it, and anything else is
// read from `Object.prototype` (its `__proto__` is `Object.prototype`
// itself, not `Object.prototype.__proto__`).
function main(key: string) {
  var c1 = key.length & 1, c2 = key.length & 2;
  var a = { k: 1, m: "a", 0: "zero" };
  var b = { k: 2, toString: 5 };
  var o = c1 ? a : b;
  var o2 = c2 ? o : { k: 3, __proto__: null };
  var v = o[key];
  var w = o2[key];
  return [
    v === Object.prototype,
    typeof v,
    v === Object.prototype.toString,
    v === Object.prototype.hasOwnProperty,
    typeof v === "function" ? "fn" : String(v),
    w === null ? "null" : typeof w === "function" ? "fn" : String(w),
  ].join(",");
}
