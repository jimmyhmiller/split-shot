// inputs: [0, 2, 5]
// after: [globalThis.gd.flat([4, 5]).join(","), Array.from(globalThis.gd.g([1, 2], (x) => [x, -x])).join(",")].join("|")
// A residual generator whose loop delegates (`yield*`) inside a dynamic
// `if`: the `if`'s pending join was never consumed when an arm left the
// loop, so the specialization state grew every iteration and never tied.
function main(n) {
  function* g(xs, f) { for (const x of xs) { yield* f(x); } }
  function* flatMapIt(iter, f) { for (const x of iter) { const inner = f(x); if (inner) yield* inner; } }
  const flat = (xs) => Array.from(flatMapIt(xs, (v) => (v === n ? null : [v, v * 100])));
  globalThis.gd = { g, flat };
  return [flat([1, 2, 3]).join(","), Array.from(g([n, 1], (x) => [x, x + 1])).join(",")].join("|");
}
