// Captured variables written exactly once (a `var`'s one initializer, a
// function declaration) are final after that write: a closure made once may
// take the value itself instead of the variable's cell. What must keep its
// cell: a variable written again (in a loop, by a nested function, by a
// for-in head, `var e` inside `catch (e)` writing the
// parameter), and functions that reach each other (each needs the other made
// first if taken by value).
var out = {};
(function () {
  function isEven(n) { return n === 0 ? true : isOdd(n - 1); }
  function isOdd(n) { return n === 0 ? false : isEven(n - 1); }
  function get() { return [lib.name, later, inLoop, nested, key, fromCatch].join(","); }
  var lib = { name: "lib" };
  var later = "later";
  for (var i = 0; i < 3; i++) { var inLoop = i; }
  var nested = "n0";
  function bump() { nested = nested + "+"; }
  var key;
  for (var key2 in { a: 1, b: 2 }) { key = key2; }
  var fromCatch = "c0";
  try { throw 1; } catch (fromCatch) { var fromCatch = "inside"; }
  out.isEven = isEven;
  out.get = get;
  out.bump = bump;
})();
inspect = function() {
  var a = out.get();
  out.bump();
  return [out.isEven(10), out.isEven(7), a, out.get()].join("|");
};
