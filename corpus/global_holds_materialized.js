// inputs: [0, 2, 5]
// after: [globalThis.gHeld.k, globalThis.gHeld === globalThis.gHeld2].join("|")
// A tracked global holding an object that a dynamic loop head materializes
// (the global kept a reference to an object removed from the heap: a crash).
function main(n) {
  var o = { k: 0 };
  globalThis.gHeld = o;
  for (var i = 0; i < n; i++) o.k += i;
  globalThis.gHeld2 = o;
  return o.k;
}
