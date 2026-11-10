// Shape is static data the interpreter owns; slot values are dynamic.
function entry(input) {
  var shapes = [{ keys: [] }, { keys: ["x"] }, { keys: ["x", "y"] }];
  function slotOf(shape, key) { var i = 0; while (i < shape.keys.length) { if (shape.keys[i] === key) return i; i = i + 1; } return -1; }
  function make(a, b) { return { shape: shapes[2], slots: [a, b] }; }
  function get(o, key) { var s = slotOf(o.shape, key); if (s < 0) return hostMissing(key); return o.slots[s]; }
  var p = make(input, input + 1);
  return get(p, "x") * get(p, "y");
}
