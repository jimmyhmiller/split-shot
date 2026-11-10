// inputs: [0, 2, 5]
// after: [typeof globalThis.evalDefinedGlobal, globalThis.evalDefinedGlobal].join("|")
// An indirect eval runs in the global scope: its `var` defines a global and
// it cannot see this function's locals (printed as `eval(...)` it would be a
// direct eval in the residual's scope).
function main(n) {
  var local = n + 1;
  const ev = eval;
  const r = (0, eval)("var evalDefinedGlobal = 40 + 2; typeof local");
  return [r, ev("1 + 2") + n, local].join("|");
}
