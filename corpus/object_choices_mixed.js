// inputs: [0, 1, 2, 3, 4, 5, 6, 7, 12, 25]
// A choice of an object and a primitive (`c ? o : null`): tested, compared,
// passed to a standard function and asked its type, each on both sides; a
// read of a side that is no object happens at runtime (and throws there).
// An object passed to `Array.prototype.indexOf.call` on a runtime list is
// only compared there, so it stays modeled; `JSON.stringify` of an object
// holding runtime values prints a copy of what it prints.
function main(n) {
  var out = [];
  var meta = { m: 1 };
  var o = n & 1 ? meta : null;
  out.push(o ? "obj" : "none", o == null, o === null, o != undefined, typeof o, Boolean(o), !o);
  out.push(Array.isArray(n & 2 ? [1] : null), Array.isArray(n & 2 ? meta : [2]));
  var p = n & 4 ? { k: n } : undefined;
  var label = p ? "has " + p.k : "missing";
  out.push(label);
  var q = n & 2 ? 0 : { z: 1 };
  out.push(q ? q.z : "zero", JSON.stringify(q));
  try {
    out.push(o.m);
  } catch (e) {
    out.push(e instanceof TypeError);
  }
  // Compared only: still modeled after, and not the runtime list's.
  var list = String(n).split("");
  var probe = { t: 1 };
  out.push(Array.prototype.indexOf.call(list, probe), Array.prototype.includes.call(list, probe));
  probe.t = 2;
  out.push(probe.t, Array.prototype.lastIndexOf.call(list, String(n % 10)));
  // What JSON prints: no undefined or function property, null elements.
  var data = { a: list.length, u: undefined, f: function () {}, arr: [undefined, list[0], function () {}, , 3], nested: { x: list.join("") } };
  out.push(JSON.stringify(data), data.u === undefined, typeof data.f);
  data.nested.x = "changed";
  out.push(JSON.stringify(data.nested));
  return out.join(",");
}
