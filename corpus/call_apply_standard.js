// inputs: [0, 3, "ab"]
// forbid-main: \.apply\(|fromCharCode|toUpperCase|indexOf|Set\(
// `.call` and `.apply` of standard functions on known values are the functions' calls: a static one that ignores its `this` (`Math.max.apply(null, list)`, `String.fromCharCode.apply`), a prototype's method on a receiver of its kind (`Array.prototype.slice.call(list, 1)`, a string's, a number's), an array's method on `arguments` or another array-like. Two reads of one built-in method are one function. On a runtime receiver the call is the runtime's.
function tail() { return Array.prototype.slice.call(arguments, 1).join("+"); }
function count() { return [].slice.call(arguments).length + Array.prototype.map.call(arguments, function (x) { return x * 2; }).join("").length; }
function main(input) {
  var list = [3, 1, 2];
  var it = new Set([1, 2]).keys();
  return [
    Math.min.apply(null, [3, 1, 2]), Math.max.apply(Math, list), Math.max.call(null, 3, 9), Object.keys.call(null, { a: 1 }).length,
    String.fromCharCode.apply(null, [104, 105]), Array.prototype.slice.call([1, 2, 3], 1).join(), Array.prototype.map.call([1, 2], function (x) { return x * 2; }).join(),
    Array.prototype.push.apply(list, [7, 8]), list.length, String.prototype.toUpperCase.call("ab"), Number.prototype.toString.call(255, 16),
    tail(1, 2, 3), count(4, 5), Array.prototype.indexOf.call({ length: 2, 0: "a", 1: "b" }, "b"), Array.prototype.concat.call([1], [2]).length,
    it.next === it.next, it.next === new Set().values().next, [].map === [1].map, [].map === [].filter,
    Array.prototype.slice.call(input).length, Math.max.apply(null, [input, 2]),
  ];
}
