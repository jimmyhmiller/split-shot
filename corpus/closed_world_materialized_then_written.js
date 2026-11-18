// inputs: [{"i": 0, "x": "a"}, {"i": 1, "x": "b"}, {"i": 5, "x": "c"}]
// A global's cyclic object that `main` reaches by a runtime index (so
// `main` makes it, as it escapes) and also writes at every call: the
// object is the load code's one object, its writes accumulating across
// calls, not a copy `main` makes afresh (making it, in two phases, is no
// write; pushing to it is).
var reg = { name: "r", items: [["seed", 0]], self: null };
reg.self = reg;
reg.items.push({ owner: reg });
function main(input) {
  var t = reg.items;
  var picked = t[input.i];
  t.push([input.x, t.length]);
  return [reg.self === reg, reg.items.length, picked === undefined ? "none" : JSON.stringify(picked === reg.items[1] ? "owner" : picked), t[t.length - 1][0]];
}
