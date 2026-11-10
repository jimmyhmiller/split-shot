// inputs: [0, 1, 3]
// A read of a runtime object's property that is still pending (not yet
// evaluated) when the property is written must be evaluated first, wherever
// it is held: pushed onto a modeled array, in an object field, in a caller's
// frame, behind an alias of the object.
function main(n) {
  var o = { n: n };
  globalThis.keepO = o;          // o is a runtime object from here
  var p = globalThis.keepO;      // an alias
  var r = [];
  for (var i = 0; i < 3; i++) {
    o.n = i * 10 + n;
    r.push("v" + p.n);
  }
  var q = { a: o.n };
  function bump() { p.n = 99; return 1; }
  var t = o.n + bump();
  o.n = 5;
  return [r.join(","), q.a, t, p.n].join("|");
}
