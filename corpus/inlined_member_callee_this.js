// inputs: [0, 1]
// after: [main(0)[0](), main(1)[1]()]
// A method read into a temporary, then called: the call has no `this`.
// Inlining the temporary into the call must not make it `recv.m()` (which
// would pass `recv` as `this`).
function main(input) {
  const g = { fn: function () { "use strict"; return this === undefined; }, n: input };
  const run = function () { const fn = g.fn; return fn(); };
  const runIndex = function () { const fn = [g.fn][0]; return fn(); };
  return [run, runIndex];
}
