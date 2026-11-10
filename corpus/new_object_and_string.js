// inputs: [0, 1, 4]
// `new Object()` is a fresh ordinary object and `new String(lit)` a String
// object: each its own identity; a String object is a runtime value as
// soon as anything but its identity is used. A weak collection's entry
// whose key nothing else reaches is gone.
function main(n) {
  var o = new Object();
  o.k = n;
  var s1 = new String("ab" + "c");
  var s2 = new String("abc");
  var w = new WeakMap();
  w.set(o, 1);
  w.set(new String("dead"), 2);
  var ws = new WeakSet([s1]);
  return [
    o.k,
    typeof o,
    typeof s1,
    s1 === s2,
    s1 == "abc",
    s1 + "!",
    s1.length,
    s1 instanceof String,
    w.has(o),
    ws.has(s1),
    ws.has(s2),
    Object.keys(new Object(null)).length,
  ].join(",");
}
