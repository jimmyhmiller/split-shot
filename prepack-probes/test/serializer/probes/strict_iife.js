// Strictness of runtime writes: a write inlined from code of one strictness
// into a residual function of the other keeps its own (see Js::in_mode),
// and a strict assignment to an undeclared global throws.
var k = global.__abstract ? __abstract("string", "('a')") : "a";
var r;
(function () {
  "use strict";
  try { 0[k] = 1; r = "ok"; } catch (e) { r = "throw:" + e.name; }
})();
var r2;
(function () {
  "use strict";
  function set(o) { o[k] = 1; return "ok"; }
  r2 = set(0);
})();
inspect = function() { return r + "," + r2; };
