// inputs: [0, 1, "k", 7]
// forbid-main: (?:Object\.fromEntries|Object\.groupBy|Map\.groupBy|Array\.of|(?<![.\w])Array|Object\.hasOwn|\.isWellFormed|\.toWellFormed)\(
// Object.fromEntries, Object.groupBy, Map.groupBy, Array.of, Array called as a function, Object.hasOwn and String.prototype.isWellFormed / toWellFormed, folded by their self-hosted versions (prelude.js `__pe_std_Object_fromEntries` and the rest): entries from an array, a Map, a generator and a hand-made iterable; keys that are numbers, symbols, repeated; the order of the keys; groups in order of first appearance, keys converted (or, for a Map, kept: -0 and NaN, objects); the callback's arguments; a result with no prototype. (Calls that stay the runtime's are in std_object_group_fallback_selfhosted.js.)
function keysOf(o) {
  var r = [];
  for (var k in o) r.push(k + "=" + (Array.isArray(o[k]) ? "[" + o[k].join("|") + "]" : String(o[k])));
  return r.join(",");
}
function main(input) {
  var out = [];
  // Object.fromEntries.
  out.push(Object.fromEntries([["a", 1], ["b", 2]]), Object.fromEntries([]), Object.fromEntries([["a", 1], ["a", 2], ["b", undefined]]), Object.fromEntries(new Map([["x", 1], ["y", [2]]])));
  out.push(keysOf(Object.fromEntries([["b", 1], [2, "two"], ["a", 3], [1, "one"], [true, "t"], [null, "n"], [undefined, "u"], [1.5, "f"], [-0, "z"]])));
  out.push(keysOf(Object.fromEntries([["len", 1, "extra"], ["only"], ["", "empty"], [" p,q ", "spaced"]])));
  var fe = Object.fromEntries([["plain", 1]]);
  out.push(Object.keys(fe).length, Object.getPrototypeOf(fe) === Object.prototype, fe.toString === Object.prototype.toString);
  function* gen() { yield ["g1", 1]; yield ["g2", 2]; }
  out.push(Object.fromEntries(gen()), Object.fromEntries(new Set([["s", 1]])), Object.fromEntries(Object.entries({ p: 1, q: { r: 2 } })), Object.fromEntries([{ 0: "o", 1: "bj" }]));
  var steps = [];
  var iterable = {};
  iterable[Symbol.iterator] = function () {
    var i = 0;
    return {
      next: function () { steps.push("next"); i++; return i < 3 ? { value: ["k" + i, i], done: false } : { done: true }; },
      return: function () { steps.push("return"); return {}; }
    };
  };
  out.push(Object.fromEntries(iterable), steps.join(","));
  out.push(Object.fromEntries([["a", 1]].map(function (e) { return [e[0] + "!", e[1] * 2]; })), Object.fromEntries(["a", "b"].entries()));
  // Object.groupBy.
  var g = Object.groupBy([1, 2, 3, 4, 5, 6], function (x) { return x % 2 ? "odd" : "even"; });
  out.push(g, Object.getPrototypeOf(g) === null, keysOf(g), Object.keys(g).join());
  out.push(keysOf(Object.groupBy(["apple", "avocado", "banana", "blueberry", "cherry"], function (s) { return s[0]; })));
  out.push(keysOf(Object.groupBy([3, 1, 2, 1, 3, 10], function (x) { return x; })), keysOf(Object.groupBy([1, 2, 3], function (x, i) { return i; })), keysOf(Object.groupBy([], function (x) { return x; })));
  out.push(keysOf(Object.groupBy([0, -0, NaN, null, undefined, true, 1.5, "1.5", 1e21], function (x) { return x; })));
  out.push(keysOf(Object.groupBy("hello", function (c) { return c === "l" ? "L" : "other"; })), keysOf(Object.groupBy(new Set([1, 2, 3, 4]), function (x) { return x > 2; })), keysOf(Object.groupBy(new Map([[1, "a"], [2, "b"]]), function (e) { return e[1]; })));
  var gs = Object.groupBy([1, 2, 3], function (x) { return x === 2 ? "__proto__" : "constructor"; });
  out.push(Object.keys(gs).join(), gs["__proto__"].join(), gs.constructor.join(), Object.getPrototypeOf(gs) === null);
  var calls = [];
  Object.groupBy(["a", "b"], function () { calls.push(arguments.length + ":" + arguments[0] + ":" + arguments[1] + ":" + (this === undefined)); return "k"; });
  out.push(calls.join(" "));
  var grouped = Object.groupBy([{ t: "x", v: 1 }, { t: "y", v: 2 }, { t: "x", v: 3 }], function (o) { return o.t; });
  out.push(grouped.x.length, grouped.x[1].v, grouped.y[0].v, "z" in grouped);
  // Map.groupBy.
  var mg = Map.groupBy([1, 2, 3, 4, 5, 6], function (x) { return x % 3; });
  out.push(mg instanceof Map, mg.size, Array.from(mg.keys()).join(), mg.get(0).join(), mg.get(1).join(), mg.get(2).join(), mg.get(3));
  var ka = { n: "a" };
  var kb = { n: "b" };
  var mo = Map.groupBy([1, 2, 3, 4], function (x) { return x % 2 ? ka : kb; });
  out.push(mo.get(ka).join(), mo.get(kb).join(), mo.size, mo.has({ n: "a" }));
  var mz = Map.groupBy([0, -0, NaN, NaN, "0", undefined, null, undefined], function (x) { return x; });
  out.push(mz.size, mz.get(0).length, Object.is(Array.from(mz.keys())[0], 0), mz.get(NaN).length, mz.get("0").length, mz.get(undefined).length, mz.get(null).length);
  out.push(Map.groupBy([], function (x) { return x; }).size, Array.from(Map.groupBy("abca", function (c, i) { return c + (i > 2); })).join(";"), Array.from(Map.groupBy(new Set([5, 6]), function (x, i) { return i; }).values()).join(";"));
  // Array.of.
  var ao = Array.of(7);
  out.push(Array.of(), Array.of(1, 2, 3), ao.length, ao[0], Array.of(undefined).length, 0 in Array.of(undefined), Array.of(3, "a", null, [1], { a: 1 }), Array.of(1, 2).map(function (x) { return x * 2; }), Array.isArray(Array.of()));
  // Array called as a function: a length, or the elements.
  var a3 = Array(3);
  out.push(a3.length, 0 in a3, Array().length, Array(0).length, Array(-0).length, Array("3"), Array("3").length, Array(1, 2), Array(undefined).length, 0 in Array(undefined), Array(null), Array(true), Array([4]).length, Array(2, undefined, 3).length, Array(3).fill(7), Array(2).join("-"), Array(4).map(function () { return 1; }).length, Array(5, 6)[1]);
  // Object.hasOwn.
  var proto = { inherited: 1 };
  var child = Object.create(proto);
  child.own = 2;
  out.push(Object.hasOwn({ a: 1 }, "a"), Object.hasOwn({ a: 1 }, "b"), Object.hasOwn({ a: undefined }, "a"), Object.hasOwn({}, "toString"), Object.hasOwn(child, "own"), Object.hasOwn(child, "inherited"), Object.hasOwn({ 1: "x" }, 1), Object.hasOwn({ 1: "x" }, "1"), Object.hasOwn(fe, "plain"));
  out.push(Object.hasOwn([1, , 3], 0), Object.hasOwn([1, , 3], "2"), Object.hasOwn([1, , 3], 3), Object.hasOwn([], "length"), Object.hasOwn([], "push"), Object.hasOwn(function () {}, "call"), Object.hasOwn(g, "odd"), Object.hasOwn(g, "hasOwnProperty"));
  // isWellFormed, toWellFormed.
  out.push("".isWellFormed(), "abc".isWellFormed(), "a😀b".isWellFormed(), "\u{10ffff}퟿".isWellFormed(), "".toWellFormed(), "abc".toWellFormed(), "a😀b".toWellFormed(), "😀😀".toWellFormed().length, "é\u{1f600}".toWellFormed() === "é😀");
  return out;
}
