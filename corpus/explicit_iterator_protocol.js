// inputs: [0, 1, 2, "ab"]
// after: [globalThis.kept.selfIter.call(globalThis.kept.live) === globalThis.kept.live, typeof globalThis.kept.next, globalThis.kept.strIter.call("z").next().value, globalThis.kept.mapNext.call(new Map([[1, 2]]).entries()).value.join(), [...globalThis.kept.live].join()]
// forbid-return: \.next|Symbol\.iterator
// The iterator protocol written out (what a transpiled `for..of` does): `x[Symbol.iterator]()` of an array, a string, a Map and a Set, an array's `values`/`keys`/`entries`, `next` read once and called on the iterator, an iterator's own `[Symbol.iterator]`; all fold on known values. The same method values handed to runtime code are the runtime's own methods.
function main(input) {
  var out = [];
  var a = [10, 20, 30];
  var it = a[Symbol.iterator]();
  var next = it.next;
  for (var r = next.call(it); !r.done; r = next.call(it)) out.push(r.value);
  out.push(it.next().done, it[Symbol.iterator]() === it);
  var ks = a.keys(), es = a.entries(), vs = a.values();
  out.push(ks.next().value, ks.next().value, es.next().value.join(":"), es.next().value[1], vs.next().value);
  var s = "h\u{1F600}y"[Symbol.iterator]();
  out.push(s.next().value, s.next().value.length, s.next().value, s.next().done);
  var m = new Map([["k", 1], ["l", 2]]);
  var mi = m[Symbol.iterator]();
  out.push(mi.next().value.join("="), mi[Symbol.iterator]() === mi, [...mi].length);
  var si = new Set([7, 8])[Symbol.iterator]();
  out.push(si.next().value, si.next().value, si.next().done);
  var f = [][Symbol.iterator];
  out.push(f === Array.prototype.values, f.call([5, 6]).next().value);
  function manual(iterable) {
    var acc = [], i = iterable[Symbol.iterator](), step;
    while (!(step = i.next()).done) acc.push(step.value);
    return acc.join(",");
  }
  out.push(manual([1, 2, 3]), manual("abc"), manual(new Set(["x", "y"])), manual(a.keys()));
  // Handed to runtime code: the methods themselves, and a live iterator.
  var live = [1, 2, 3][Symbol.iterator]();
  live.next();
  globalThis.kept = { selfIter: live[Symbol.iterator], next: live.next, strIter: ""[Symbol.iterator], mapNext: m.entries().next, live: live };
  // A runtime receiver: the runtime's call.
  var dyn = [input, input][Symbol.iterator]();
  dyn.next();
  out.push(typeof input === "string" ? [...input[Symbol.iterator]()].length : -1);
  return [out, input];
}
