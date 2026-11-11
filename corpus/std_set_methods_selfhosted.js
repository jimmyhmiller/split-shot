// inputs: [0, 1, 2, 5, "a"]
// forbid-main: \.(?:union|intersection|difference|symmetricDifference|isSubsetOf|isSupersetOf|isDisjointFrom)\(
// The ES2025 Set methods of known Sets, folded by their self-hosted versions (prelude.js `__pe_Set_union` and the rest): against a Set, a Map and a hand-made set-like; the order of the result; which of `size`, `has`, `keys`, `next` and `return` a set-like sees, in order, by the sizes; -0, NaN, objects as elements; the receiver and argument unchanged. (Calls that stay the runtime's are in std_set_methods_fallback_selfhosted.js.)
function show(s) {
  var r = "";
  for (var v of s) r += (typeof v === "string" ? '"' + v + '"' : typeof v === "object" && v !== null ? "obj" : Object.is(v, -0) ? "-0" : String(v)) + ",";
  return s.size + ":" + r;
}
function main(input) {
  var out = [];
  var A = new Set([3, 1, 2, "a", NaN, 0]);
  var B = new Set([2, 9, "a", 8, 3, NaN]);
  var small = new Set([2, "z"]);
  var empty = new Set();
  var names = ["union", "intersection", "difference", "symmetricDifference", "isSubsetOf", "isSupersetOf", "isDisjointFrom"];
  function all(x, y) {
    var r = [];
    var u = x.union(y); r.push(show(u));
    var i = x.intersection(y); r.push(show(i));
    var d = x.difference(y); r.push(show(d));
    var s = x.symmetricDifference(y); r.push(show(s));
    r.push(x.isSubsetOf(y), x.isSupersetOf(y), x.isDisjointFrom(y));
    return r.join(" ");
  }
  out.push(all(A, B), all(B, A), all(A, small), all(small, A), all(A, empty), all(empty, A), all(empty, empty), all(A, A));
  out.push(show(A), show(B), show(small));
  out.push(all(new Set([1, 2]), new Set([1, 2, 3])), all(new Set([1, 2, 3]), new Set([2, 1])), all(new Set([1, 2]), new Set([3, 4])), all(new Set([1]), new Set([1])));
  // Order: the receiver's, then the argument's; an intersection driven by the smaller side.
  out.push(show(new Set([1, 2, 3]).intersection(new Set([3, 2]))), show(new Set([1, 2, 3]).intersection(new Set([3, 2, 7, 8]))), show(new Set([3, 2, 1]).union(new Set([0, 1, 4]))), show(new Set([1, 2, 3]).symmetricDifference(new Set([3, 5, 1, 4]))), show(new Set([1, 2, 3, 4]).difference(new Set([2, 9, 4, 8, 7]))), show(new Set([1, 2, 3, 4]).difference(new Set([4, 1]))));
  // The result is a new Set.
  var u = A.union(empty);
  u.add("more");
  out.push(u !== A, A.has("more"), u.size, A.size, u instanceof Set);
  // A Map as the set-like: its keys.
  var M = new Map([[1, "one"], ["a", "A"], [7, "seven"]]);
  out.push(all(A, M), all(new Set([1, "a", 7]), M), all(new Set([1]), M), all(new Set([1, "a", 7, 8]), M));
  // Elements: -0 comes out as 0, NaN is one value, objects by identity.
  var o1 = { n: 1 };
  var o2 = { n: 2 };
  out.push(show(new Set([0]).union(new Set([-0, NaN]))), show(new Set([NaN, o1]).intersection(new Set([o1, o2, NaN]))), show(new Set([o1]).difference(new Set([o2]))), new Set([o1]).isSubsetOf(new Set([o2, o1])), new Set([o1]).isDisjointFrom(new Set([o2])));
  // A hand-made set-like, and what it sees.
  function like(items, size, log) {
    return {
      get size() { log.push("size"); return size; },
      has: function (v) { log.push("has " + String(v)); return items.indexOf(v) >= 0; },
      keys: function () {
        log.push("keys");
        var i = 0;
        return {
          next: function () { log.push("next"); return i < items.length ? { value: items[i++], done: false } : { value: undefined, done: true }; },
          return: function () { log.push("return"); return {}; }
        };
      }
    };
  }
  var sizes = [0, 1, 3, 4, 100, Infinity, 2.9, "3", true];
  for (var n = 0; n < names.length; n++) {
    for (var k = 0; k < sizes.length; k++) {
      var log = [];
      var res = new Set([1, 2, 3])[names[n]](like([3, -0, 1, 5, 3], sizes[k], log));
      out.push(names[n] + " " + String(sizes[k]) + " -> " + (typeof res === "boolean" ? String(res) : show(res)) + " | " + log.join(","));
    }
  }
  var log2 = [];
  out.push(new Set([1, 2, 3]).isSupersetOf(like([1, 9, 2], 2, log2)), new Set([1, 2, 3]).isDisjointFrom(like([7, 2, 8], 1, log2)), new Set([1, 2, 3]).isSupersetOf(like([3, 2], 2, log2)), log2.join(","));
  // An iterator whose keys are not unique, and whose values the set-like does not `has`.
  var log3 = [];
  out.push(show(new Set([1, 2]).union(like([5, 5, 1, 6, 5], 0, log3))), show(new Set([1, 2, 3]).symmetricDifference(like([1, 1, 4, 4, 2], 0, log3))), show(new Set([1, 2, 3, 4, 5]).intersection(like([4, 4, 9, 2, 4], 2, log3))), show(new Set([1, 2, 3, 4, 5]).difference(like([4, 4, 9, 2], 2, log3))));
  // A set-like whose `keys` gives a built-in iterator (where no early exit has to close it).
  var arrLike = { size: 2, has: function (v) { return v === 1; }, keys: function () { return [1, 2][Symbol.iterator](); } };
  var three = new Set([1, 2, 3]);
  out.push(show(three.union(arrLike)), show(three.intersection(arrLike)), show(three.difference(arrLike)), show(three.symmetricDifference(arrLike)), three.isSubsetOf(arrLike), three.isSupersetOf(arrLike), new Set([1]).isDisjointFrom(arrLike), new Set([5]).isDisjointFrom(arrLike), new Set([1]).isSubsetOf(arrLike));
  return out;
}
