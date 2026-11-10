// Strictness of runtime writes: a write inlined from code of one strictness
// into a residual function of the other keeps its own (see Js::in_mode),
// and a strict assignment to an undeclared global throws.
function strictSet(k) {
  "use strict";
  0[k] = 1;
  return "ok";
}
function main(k) { return strictSet(k); }
global.main = main;
inspect = function() { try { return main("a"); } catch (e) { return "throw:" + e.name; } };
