// The object comes from the opaque heap. Its shape id is a runtime number;
// the candidate shapes are static, so each guard arm knows the layout. The
// lookup assigns its result once and has one exit.
function entry(input) {
  var shapes = [{ keys: [] }, { keys: ["x"] }, { keys: ["x", "y"] }, { keys: ["y", "tag", "x"] }];
  function slotOf(shape, key) { var i = 0; while (i < shape.keys.length) { if (shape.keys[i] === key) return i; i = i + 1; } return -1; }
  function guarded(o, id, key, candidates, next) {
    var result = 0;
    if (next >= candidates.length) result = hostGet(o, key);
    else if (id === candidates[next]) result = hostSlot(o, slotOf(shapes[candidates[next]], key));
    else result = guarded(o, id, key, candidates, next + 1);
    return result;
  }
  function get(o, key, candidates) { return guarded(o, hostShapeOf(o), key, candidates, 0); }
  var o = hostObject(input);
  return get(o, "x", [2, 3]) + get(o, "y", [2, 3]);
}
