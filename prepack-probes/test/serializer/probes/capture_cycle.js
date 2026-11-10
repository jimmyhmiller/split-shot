// Escaping closures that call each other in a cycle. `A`'s variable is not
// written after `A` is made, so `C` takes `A`'s function by value; `A`, `B`
// and `C` reach each other through cells (their variables are written after
// the functions that read them are made). A function has to exist before one
// that takes it by value is made: `C` after `A`, though `A` reaches `C`
// (through `B`'s cell and `C`'s).
var out = [];
(function () {
  var A = function (n) { return n > 0 ? B(n - 1) : "A"; };
  var B = function (n) { return n > 0 ? C(n - 1) : "B"; };
  var C = function (n) { return n > 0 ? A(n - 1) : D(); };
  var D = function () { return "D"; };
  var E = function (n) { return A(n) + B(n); };
  out.push(E, C);
})();
inspect = function() { return [0, 1, 2, 3, 4, 5].map(function (n) { return out[0](n) + "/" + out[1](n); }).join(","); };
