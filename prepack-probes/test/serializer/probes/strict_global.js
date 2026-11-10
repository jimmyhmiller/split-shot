// Strictness of runtime writes: a write inlined from code of one strictness
// into a residual function of the other keeps its own (see Js::in_mode),
// and a strict assignment to an undeclared global throws.
var r;
(function () {
  "use strict";
  try { notDeclaredAnywhere = 1; r = "ok"; } catch (e) { r = "throw:" + e.name; }
})();
var r2;
(function () {
  "use strict";
  function set() { alsoNotDeclared = 2; return "ok"; }
  try { r2 = set(); } catch (e) { r2 = "throw:" + e.name; }
})();
inspect = function() { return r + "," + r2 + "," + typeof notDeclaredAnywhere + "," + typeof alsoNotDeclared; };
