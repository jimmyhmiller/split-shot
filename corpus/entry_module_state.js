// inputs: [1, 2, 3]
// forbid-main: table|\.scale|Object\.freeze
// A script's top-level code runs once, when it loads, and every call of
// `main` sees what the calls before it changed: a counter in a closure, a
// log array, a `var` global. What no call changes stays folded (the frozen
// table and the scale function are read at specialization time).
const table = Object.freeze({ a: 10, b: 20, scale(v) { return v * 3; } });
const counter = (function () {
  let n = 0;
  return { next() { return ++n; } };
})();
const log = [];
var hits = 0;
function main(x) {
  hits += x;
  log.push(x);
  return [table.scale(table.a) + x, counter.next(), log.length, hits];
}
