// inputs: [0, 1, "k", 7, "__proto__"]
// Object.fromEntries, Object.groupBy, Map.groupBy, Array.of and Object.hasOwn where the self-hosted versions (prelude.js) do not fold and the call stays the runtime's or what is made holds runtime values, with the same answer: a runtime key, a runtime entry list, a "__proto__" entry (an own property an assignment would not make), keys that are objects, a callback over runtime items, symbols made at run time as keys, a key that names a property of Object.prototype, `Array.of.apply`, Array of a length that is not one (a RangeError) or is a runtime value, and Object.hasOwn of a hole, of a function's `length` and of a primitive.
function keysOf(o) {
  var r = [];
  for (var k in o) r.push(k + "=" + (Array.isArray(o[k]) ? "[" + o[k].join("|") + "]" : String(o[k])));
  return r.join(",");
}
function main(input) {
  var out = [];
  var fe = Object.fromEntries([[input, 1], ["b", input]]);
  out.push(keysOf(fe), Object.getPrototypeOf(fe) === Object.prototype, Object.hasOwn(fe, "__proto__"));
  var pe = Object.fromEntries([["__proto__", 5], ["a", 1]]);
  out.push(Object.keys(pe).join(), Object.getPrototypeOf(pe) === Object.prototype, pe.a);
  out.push(keysOf(Object.fromEntries([[{ toString: function () { return "named"; } }, 1]])), keysOf(Object.fromEntries([[["x", "y"], 1]])));
  var items = [1, 2, input, 4];
  out.push(keysOf(Object.groupBy(items, function (x) { return typeof x; })), keysOf(Object.groupBy([1, 2, 3], function (x) { return x === 2 ? input : "s"; })));
  out.push(keysOf(Object.groupBy([1, 2], function (x) { return { toString: function () { return "o" + x; } }; })), keysOf(Object.groupBy([1, 2, 3], function (x) { return [x % 2]; })));
  var mg = Map.groupBy(items, function (x) { return x === input; });
  out.push(mg.size, mg.get(true).length, (mg.get(false) || []).length, Array.from(Map.groupBy([1, 2, 3], function (x) { return x > 1 ? input : 0; }).keys()).length);
  out.push(Array.of(input, 2), Array.of(input).length, Object.hasOwn({ a: 1, k: 2 }, input), Object.hasOwn([5, 6], input), Object.hasOwn("abc", 1), Object.hasOwn("abc", "length"), Object.hasOwn(5, "x"));
  var sym = Symbol("s");
  var fs = Object.fromEntries([[sym, "symbol"], ["plain", 1]]);
  out.push(fs[sym], Object.keys(fs).length, Object.getPrototypeOf(fs) === Object.prototype, Object.fromEntries([["toString", 5]]).toString, Object.hasOwn(fs, sym), Object.hasOwn(fs, Symbol("s")));
  var gs = Object.groupBy([1, 2], function (x) { return x === 1 ? sym : "__proto__"; });
  out.push(gs[sym].join(), Object.keys(gs).join(), gs["__proto__"].join(), Object.getPrototypeOf(gs) === null);
  out.push(Array.of.apply(Array, [1, 2]).length, Object.hasOwn([1, , 3], 1), Object.hasOwn(function f(a, b) {}, "length"));
  var lens = [];
  try { lens.push(Array(2.5).length); } catch (e) { lens.push(e.name); }
  try { lens.push(Array(-1).length); } catch (e) { lens.push(e.name); }
  try { lens.push(Array(4294967296).length); } catch (e) { lens.push(e.name); }
  try { lens.push(Array(NaN).length); } catch (e) { lens.push(e.name); }
  out.push(lens, Array(typeof input === "number" ? input : 2).length, Array(input, 1).length, Array(4294967295).length);
  return out;
}
