// inputs: [0, 3]
// Optional chaining (members, computed, calls keeping the receiver, the
// whole chain short-circuiting) and logical assignment in statement position.
function main(n) {
  var o = n > 1 ? { a: { b: { c: n, f: function (x) { return this.c + x; } } }, arr: [10, 20], g: null } : null;
  var calls = 0;
  function side() { calls++; return 1; }
  var r = [
    o?.a.b.c,
    o?.a?.b?.c,
    o?.g?.x.y.z,
    o?.arr?.[1],
    o?.a.b.f(5),
    o?.a.b.f?.(6),
    o?.missing?.(side()),
    (o?.a)?.b.c,
    o?.["a"]?.["b"]?.c,
  ];
  var x = null;
  x ??= 7;
  var y = 0;
  y ||= side();
  var z = 1;
  z &&= 2;
  var p = { q: null };
  p.q ??= "set";
  return JSON.stringify([r, calls, x, y, z, p.q]);
}
