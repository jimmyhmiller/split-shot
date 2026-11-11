// inputs: [{"n":1}, {"n":2}]
// forbid: null\.|\.message|catch|startBlock
// A property of `null` or `undefined` read in a `try` throws the TypeError the engine throws there (its message as V8 words it), which the `catch` gets as the program runs: the catch's own work folds with it. A read the program does not make, the right side of `o.ext?.k` or `n && n.k` when the left is nullish, throws nothing, though the compact form of those expressions computes it.
var log = (function () {
  var o = { ext: null }, n = null, u;
  var log = [];
  try { log.push(o.ext?.startBlock, n && n.x, u?.y); } catch (e) { log.push("wrong: " + e.message); }
  try { null.error; log.push("unreached"); } catch (e) { log.push(e instanceof TypeError, e.name, e.message); }
  try { u.y; } catch (e) { log.push(e.message); }
  return log;
})();
function main(input) {
  return log.concat([input.n]);
}
