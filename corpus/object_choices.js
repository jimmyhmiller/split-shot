// inputs: [0, 1, 2, 3, 4, 5, 6, 7]
// An object chosen at runtime (`c ? a : b`, both objects) stays a choice of
// the two: reads and writes go to both sides, a write as `c ? v : old`, and
// an intrinsic array method that changes nothing runs on each. Anything else
// done with it (comparing it, passing it, storing it, deleting from it, a
// write that adds a property to one side) sees the runtime object.
function id(x) {
  return x;
}
function main(n) {
  var c1 = n & 1, c2 = n & 2, c3 = n & 4;
  var a = { k: 1, m: "a" };
  var b = { k: 2, m: "b" };
  var d = { k: 3 };
  var o1 = c1 ? a : b;
  var o2 = c2 ? o1 : d;
  o2.k = o2.k * 10;
  var out = [a.k, b.k, d.k, o2.m, o1.m];
  // Identity: one of the two, and not a third.
  out.push(o1 === a, o1 === b, o2 === d, o1 !== o2);
  // Aliases see the writes, both ways.
  a.k = 7;
  out.push(o1.k, o2.k);
  // Passed to code, stored, then read back through the other name.
  var holder = { inner: o1 };
  id(o2).m = "z";
  out.push(holder.inner.m, a.m, b.m, d.m);
  // A property only one side has.
  var p = c3 ? { x: 1 } : {};
  p.x = 5;
  out.push(JSON.stringify(p), "x" in p);
  var q = c1 ? { y: 1 } : { z: 2 };
  delete q.y;
  out.push(Object.keys(q).join("|"));
  // Deleting from an object only under a condition: every name of it sees
  // it, whatever is done with it after.
  var da = { k: 1, keep: "x" };
  var db = { k: 2 };
  var dch = c2 ? da : db;
  delete dch.k;
  var dalias = da;
  out.push(String(da.k), "k" in da, JSON.stringify(dalias), Object.keys(db).join(""));
  dch.k = 9;
  out.push(da.k, db.k, id(da) === dalias);
  delete dch.k;
  delete dch.keep;
  out.push(JSON.stringify([da, db]));
  // Arrays: pure methods on each, then a mutation.
  var arr = c2 ? [1, 2, 3] : [4, 5];
  out.push(arr.join("-"), arr.length, arr.indexOf(5), arr.slice(1).join(""));
  arr.push(9);
  out.push(arr.join("-"));
  // Nested objects through a choice.
  var r = c3 ? { in: { v: 1 } } : { in: { v: 2 } };
  r.in.v += 100;
  out.push(r.in.v);
  // A choice through a loop.
  var t = c1 ? { s: 0 } : { s: 100 };
  for (var i = 0; i < n; i++) t.s += i;
  out.push(t.s);
  // A key known only at runtime: own, inherited, `__proto__`, shadowed.
  var key = n % 3 == 0 ? "k" : n % 3 == 1 ? "__proto__" : "toString";
  var ch = c1 ? { k: 1 } : { k: 2, toString: 5 };
  var got = ch[key];
  out.push(got === Object.prototype, typeof got, got === Object.prototype.toString, c2 ? o1[key] === o1.k : "-");
  // Defining a property's value, its attributes as they were.
  var dp = c3 ? { w: 1 } : { w: 2 };
  Object.defineProperty(dp, "w", { value: 9, enumerable: true });
  out.push(dp.w, Object.keys(dp).join(""));
  // Truthiness and typeof.
  out.push(o1 ? "t" : "f", typeof o2);
  return out.join(",");
}
