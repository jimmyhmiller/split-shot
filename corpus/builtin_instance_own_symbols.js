// inputs: [0, 1]
// A write that gives a standard instance an own property (a registered
// symbol, a string key, a definition) is seen: what is known of it after is
// what the write left.
var K = Symbol.for("k");
var hasOwn = Object.prototype.hasOwnProperty, toStr = Object.prototype.toString;
function main(i) {
  var d = new Date(i), m = new Map([[i, i]]), v = new DataView(new ArrayBuffer(2));
  try { d[K] = 1; } catch (e) {}
  try { m[Symbol.toStringTag] = "Mine"; } catch (e) {}
  v.label = "x";
  var w = new WeakMap();
  Object.defineProperty(w, Symbol.toStringTag, { value: "Other" });
  return [hasOwn.call(d, K), toStr.call(m), hasOwn.call(m, Symbol.toStringTag), hasOwn.call(v, "label"), toStr.call(w), K in d];
}
