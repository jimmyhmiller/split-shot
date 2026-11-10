// inputs: ["k", "m", "zz", "__proto__", "0", "constructor", "toString", ""]
// A write with a key known only at runtime to a choice of objects is logged
// on each object it may be: a read of a property the object has is
// `key === "p" ? v : old`; later writes keep their order; anything else
// done with it (its keys, JSON, passing it on) replays the writes on the
// object at runtime. Every name of the object sees the write.
function id<T>(x: T): T {
  return x;
}
function main(key: string) {
  var c1 = key.length & 1, c2 = key.length & 2;
  var a = { k: 1, m: "a", 0: "zero" };
  var b = { k: 2 };
  var alias = a;
  var o = c1 ? a : b;
  o[key] = 7;
  var r1 = [a.k, a.m, b.k, alias.k, o.k];
  o.k = 100;
  var r2 = [a.k, b.k];
  var o2 = c2 ? a : b;
  o2[key] = "w";
  var r3 = [a.k, b.k, o2.k];
  return [
    r1.join("/"),
    r2.join("/"),
    r3.join("/"),
    JSON.stringify(a),
    JSON.stringify(b),
    Object.keys(id(alias)).join("|"),
    Object.getPrototypeOf(b) === Object.prototype,
    typeof a.toString,
  ].join(",");
}
