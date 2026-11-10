// inputs: [0, 1, 2, 3, 4, 7]
// Static recursion through a function with a try: each inlined activation keeps its own return value (two calls must not share one variable).
function depth(n, x){ try { if (n === 0) return x.v; return depth(n - 1, x) + 1; } catch (e) { return -100; } }
function main(x){ return [depth(3, {v: x}), depth(2, x > 1 ? null : {v: 1})]; }
