// The object comes from the opaque heap. Its shape id is a runtime number;
// the candidate shapes are static, so each guard arm knows the layout.
function entry(input) {
  var shapes = [{ keys: [] }, { keys: ["x"] }, { keys: ["x", "y"] }, { keys: ["y", "tag", "x"] }];
  function slotOf(shape, key) { var i = 0; while (i < shape.keys.length) { if (shape.keys[i] === key) return i; i = i + 1; } return -1; }
  function get(o, key, candidates) {
    var id = hostShapeOf(o);
    var k = 0;
    while (k < candidates.length) {
      if (id === candidates[k]) { var s = slotOf(shapes[candidates[k]], key); if (s >= 0) return hostSlot(o, s); }
      k = k + 1;
    }
    return hostGet(o, key);
  }
  var o = hostObject(input);
  return get(o, "x", [2, 3]) + get(o, "y", [2, 3]);
}
