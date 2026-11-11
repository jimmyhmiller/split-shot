// inputs: [0, 1, 2, 5, "a", 100]
// The ES2025 Set methods where the self-hosted versions (prelude.js `__pe_Set_union` and the rest) do not fold and the call stays the runtime's, with the same answer: a Set of runtime content as receiver or as argument, a set-like with a runtime size, and an early exit that has to close a built-in iterator a hand-made `keys` gave.
function show(s) {
  var r = "";
  for (var v of s) r += (typeof v === "string" ? '"' + v + '"' : Object.is(v, -0) ? "-0" : String(v)) + ",";
  return s.size + ":" + r;
}
function main(input) {
  var out = [];
  var A = new Set([3, 1, 2, "a", NaN, 0]);
  var B = new Set([2, 9, "a", 8, 3, NaN]);
  var dyn = new Set([1, input]);
  out.push(show(dyn.union(B)), show(A.intersection(dyn)), A.isSupersetOf(dyn), dyn.isSubsetOf(A), show(A.difference(dyn)), show(A.symmetricDifference(dyn)), A.isDisjointFrom(dyn), show(dyn.symmetricDifference(dyn)), dyn.isDisjointFrom(B));
  var log = [];
  var sized = {
    get size() { log.push("size"); return typeof input === "number" ? input : 1; },
    has: function (v) { log.push("has"); return v === 2 || v === "a"; },
    keys: function () { log.push("keys"); return [2, "a", 7][Symbol.iterator](); }
  };
  out.push(show(A.union(sized)), show(A.intersection(sized)), show(A.difference(sized)), show(A.symmetricDifference(sized)), A.isSubsetOf(sized), A.isSupersetOf(sized), A.isDisjointFrom(sized), log.join(","));
  var arrLike = { size: 2, has: function (v) { return v === 1; }, keys: function () { return [1, 2][Symbol.iterator](); } };
  out.push(new Set([1, 2, 3]).isDisjointFrom(arrLike), new Set([4, 2, 3]).isSupersetOf({ size: 1, has: function () { return true; }, keys: function () { return [9, 2].values(); } }));
  return out;
}
