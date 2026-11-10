// inputs: [0, 1]
// Strict mode: a block function is block-scoped only.
"use strict";
function main(n) {
  var out = [];
  { function g() { return "inner"; } out.push(g()); }
  out.push(typeof g);
  function f() { return 1; }
  { function f() { return 2; } }
  out.push(f());
  return out.join("|");
}
