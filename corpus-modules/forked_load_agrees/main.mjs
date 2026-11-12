// A module whose top-level code branches on what only runtime tells (a
// host probe, the clock) ends in several states. What they agree on stays
// known to `main`, where each path names it its own way: a table of
// functions, a cache `main` writes (runtime state, the same object on every
// path), a counter only one path bumped.
const debug = typeof process === "object" && process.env && process.env.NODE_DEBUG ? (...a) => a.join(" ") : () => "";
const started = Date.now();
let ticks = 0;
if (started % 2 === 0) ticks += 1;
const cache = new Map();
const ops = {
  double: (x) => x * 2,
  square: (x) => x * x,
  label: (x) => "n" + x + debug("x"),
};
function memo(name, x) {
  const key = name + ":" + x;
  if (!cache.has(key)) cache.set(key, ops[name](x));
  return cache.get(key);
}
export function main(input) {
  const n = Number(input);
  return [memo("double", n), memo("square", n), memo("label", n), cache.size > 0, typeof ticks];
}
