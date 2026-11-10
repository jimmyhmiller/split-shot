// As guarded-single-exit.js, with the candidates tried in a loop: a slot
// number is selected by comparisons, then one load uses it.
function entry(input) {
  var shapes = [{ keys: [] }, { keys: ["x"] }, { keys: ["x", "y"] }, { keys: ["y", "tag", "x"] }];
  function slotOf(shape, key) { var i = 0; while (i < shape.keys.length) { if (shape.keys[i] === key) return i; i = i + 1; } return -1; }
  function get(o, key, candidates) {
    var id = hostShapeOf(o), slot = hostNoSlot(), k = 0;
    while (k < candidates.length) {
      if (id === candidates[k]) slot = slotOf(shapes[candidates[k]], key);
      k = k + 1;
    }
    return hostSlotOrGet(o, slot, key);
  }
  var o = hostObject(input);
  return get(o, "x", [2, 3]) + get(o, "y", [2, 3]);
}
