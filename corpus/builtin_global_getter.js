// inputs: [0, 1]
// A standard global the program replaces with a throwing getter is no longer
// assumed present: reading it inside a try is caught. console.log of
// primitives (console untouched otherwise) only prints.
var hits = 0;
function main(n) {
  hits = 0;
  Object.defineProperty(globalThis, "Atomics", { configurable: true, get: function () { hits++; throw new Error("gone" + n); } });
  var r;
  try { r = typeof Atomics; } catch (e) { r = e.message; }
  return r + ":" + hits;
}
