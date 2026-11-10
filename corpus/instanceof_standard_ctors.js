// inputs: [1, "/a/", 0]
// forbid-main: "/legacy/:slug" instanceof|instanceof Date|instanceof Map
// instanceof a pristine standard constructor other than Object/Array/Function folds for a primitive, a modeled RegExp/collection and a modeled object (split-shot-specialization-gaps #6).
function main(input) {
  const re = /x/, m = new Map(), o = {}, a = [], f = function () {}, n = Object.create(null);
  return ['/legacy/:slug' instanceof RegExp ? input + 1 : input, 5 instanceof Date, re instanceof RegExp, re instanceof Map, m instanceof Map, m instanceof Set,
    o instanceof RegExp, a instanceof RegExp, f instanceof RegExp, n instanceof RegExp, input instanceof RegExp, null instanceof Error];
}
