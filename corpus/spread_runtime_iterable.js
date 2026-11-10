// inputs: [0, 2, 5]
// Spreading an iterable known only at runtime: the loop's first `next()`
// result must not be read before it exists (a garbage heap object once
// carried that read to the loop head).
function main(n) {
  var o = { a: n };
  globalThis.keepObj = o;
  var parts = JSON.parse("[" + n + ", 1, 2]");
  return [...parts, ...new Set(parts)].join(",");
}
