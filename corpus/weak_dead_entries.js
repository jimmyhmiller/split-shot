// inputs: [0, 1]
// forbid: deadKeyMarker
// An entry of a WeakMap or WeakSet whose key nothing else can reach can
// never be looked up: it is not written into the residual. A key that is
// still reachable keeps its entry.
var wm, ws, alive;
function main(n) {
  wm = new WeakMap();
  ws = new WeakSet();
  alive = { a: n };
  var dead = { deadKeyMarker: 1 };
  wm.set(alive, n + 1);
  wm.set(dead, { deadKeyMarker: 2 });
  ws.add(alive);
  ws.add(dead);
  return [wm.has(alive), wm.get(alive), ws.has(alive)].join(",");
}
