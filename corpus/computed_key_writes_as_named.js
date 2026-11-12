// inputs: [0, 1, 5]
// forbid-return: getPrototypeOf|defineProperty|getOwnPropertyNames
// A write with a key known now (`o["k"] = v`) is the named write
// (`o.k = v`) on any modeled object: a function keeps its new property
// (so esbuild's `__toESM` of a CommonJS module that sets
// `module.exports["default"]` on the function it exports folds), a
// setter on the chain runs, `__proto__` is the accessor, and an array
// gets a property that is no element.
var log = [];
function slug(s) { return "s:" + s; }
slug["default"] = slug;
slug["ext" + "end"] = function (m) { return m * 2; };
var base = { set tag(v) { log.push("tag=" + v); } };
var o = Object.create(base);
o["tag"] = "x";
var p = {};
p["__proto__"] = { hello() { return "hi"; } };
var arr = [1, 2];
arr["label"] = "pair";
arr["1"] = 7;
var ns = Object.create(Object.getPrototypeOf(slug));
Object.defineProperty(ns, "default", { value: slug, enumerable: true });
for (const key of Object.getOwnPropertyNames(slug))
  if (!Object.prototype.hasOwnProperty.call(ns, key))
    Object.defineProperty(ns, key, { get: () => slug[key], enumerable: true });
function main(i) {
  return [ns.default(i), ns.extend(i), slug.default === slug, log.join(), p.hello(), arr.label, arr[1], arr.length, Object.keys(o).length];
}
