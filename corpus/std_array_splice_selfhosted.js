// inputs: [0, 1, 2, -1, 7]
// forbid-main: \.(?:splice|toSpliced|copyWithin|with)\((?![A-Za-z_$][\w$]*, )
// Array.prototype.splice, toSpliced, copyWithin and with of known arrays, folded by their self-hosted versions (prelude.js `__pe_Array_splice` and the rest): every argument count, relative and out-of-range and non-numeric indexes, holes (kept by splice and copyWithin, read as undefined by toSpliced and with), growing and shrinking, the length afterwards; and on an array of runtime content or with a runtime index (the only calls left: the claim exempts a call whose first argument is a variable).
function show(a) {
  var s = a.length + ":";
  for (var i = 0; i < a.length; i++) s += (i in a ? (Object.is(a[i], -0) ? "-0" : String(a[i])) : "_") + ",";
  return s;
}
function main(input) {
  var out = [];
  function sp() {
    var a = [1, 2, 3, 4, 5];
    var r = a.splice.apply(a, arguments);
    out.push(show(a) + " " + show(r));
  }
  var a, r;
  a = [1, 2, 3, 4, 5]; r = a.splice(); out.push(show(a) + " " + show(r));
  a = [1, 2, 3, 4, 5]; r = a.splice(2); out.push(show(a) + " " + show(r));
  a = [1, 2, 3, 4, 5]; r = a.splice(undefined); out.push(show(a) + " " + show(r));
  a = [1, 2, 3, 4, 5]; r = a.splice(0); out.push(show(a) + " " + show(r), a.length);
  a = [1, 2, 3, 4, 5]; r = a.splice(-2); out.push(show(a) + " " + show(r));
  a = [1, 2, 3, 4, 5]; r = a.splice(-9); out.push(show(a) + " " + show(r));
  a = [1, 2, 3, 4, 5]; r = a.splice(9); out.push(show(a) + " " + show(r));
  a = [1, 2, 3, 4, 5]; r = a.splice(1, undefined); out.push(show(a) + " " + show(r));
  a = [1, 2, 3, 4, 5]; r = a.splice(1, 0); out.push(show(a) + " " + show(r));
  a = [1, 2, 3, 4, 5]; r = a.splice(1, 2); out.push(show(a) + " " + show(r), a.length);
  a = [1, 2, 3, 4, 5]; r = a.splice(1, -3); out.push(show(a) + " " + show(r));
  a = [1, 2, 3, 4, 5]; r = a.splice(1, 99); out.push(show(a) + " " + show(r));
  a = [1, 2, 3, 4, 5]; r = a.splice(1, Infinity); out.push(show(a) + " " + show(r));
  a = [1, 2, 3, 4, 5]; r = a.splice(-Infinity, 1); out.push(show(a) + " " + show(r));
  a = [1, 2, 3, 4, 5]; r = a.splice(Infinity, 1, "x"); out.push(show(a) + " " + show(r));
  a = [1, 2, 3, 4, 5]; r = a.splice(NaN, NaN, "x"); out.push(show(a) + " " + show(r));
  a = [1, 2, 3, 4, 5]; r = a.splice("1", "2", "x"); out.push(show(a) + " " + show(r));
  a = [1, 2, 3, 4, 5]; r = a.splice(1.9, 2.9, "x"); out.push(show(a) + " " + show(r));
  a = [1, 2, 3, 4, 5]; r = a.splice(-1.9, 1); out.push(show(a) + " " + show(r));
  a = [1, 2, 3, 4, 5]; r = a.splice(null, true); out.push(show(a) + " " + show(r));
  a = [1, 2, 3, 4, 5]; r = a.splice(-0, 1); out.push(show(a) + " " + show(r));
  a = [1, 2, 3, 4, 5]; r = a.splice(1, 2, "x"); out.push(show(a) + " " + show(r));
  a = [1, 2, 3, 4, 5]; r = a.splice(1, 2, "x", "y"); out.push(show(a) + " " + show(r));
  a = [1, 2, 3, 4, 5]; r = a.splice(1, 2, "x", "y", "z", "w"); out.push(show(a) + " " + show(r), a.length);
  a = [1, 2, 3, 4, 5]; r = a.splice(1, 0, "x", "y"); out.push(show(a) + " " + show(r));
  a = [1, 2, 3, 4, 5]; r = a.splice(5, 0, "x", undefined, -0); out.push(show(a) + " " + show(r));
  a = [1, 2, 3, 4, 5]; r = a.splice(0, 5, "x"); out.push(show(a) + " " + show(r));
  a = [1, 2, 3, 4, 5]; r = a.splice(0, 5); out.push(show(a) + " " + show(r), a.length);
  a = [1, 2, 3, 4, 5]; r = a.splice(4, 1); out.push(show(a) + " " + show(r));
  a = [1, 2, 3, 4, 5]; r = a.splice(-1, 1, a.length); out.push(show(a) + " " + show(r));
  a = []; r = a.splice(0, 1, "x"); out.push(show(a) + " " + show(r));
  a = []; r = a.splice(); out.push(show(a) + " " + show(r));
  a = []; r = a.splice(3, 3); out.push(show(a) + " " + show(r));
  // Holes.
  a = [1, , 3, , 5, ,]; r = a.splice(1, 2); out.push(show(a) + " " + show(r));
  a = [1, , 3, , 5, ,]; r = a.splice(1, 3, "x"); out.push(show(a) + " " + show(r));
  a = [1, , 3, , 5, ,]; r = a.splice(0, 1, "x", "y"); out.push(show(a) + " " + show(r));
  a = [1, , 3, , 5, ,]; r = a.splice(4); out.push(show(a) + " " + show(r));
  a = [1, , 3, , 5, ,]; r = a.splice(5, 1); out.push(show(a) + " " + show(r));
  a = [1, , 3, , 5, ,]; r = a.splice(0, 0, "x"); out.push(show(a) + " " + show(r), a.length);
  a = [1, , 3, , 5, ,]; r = a.splice(2, 2, "x", "y"); out.push(show(a) + " " + show(r));
  a = [, ,]; r = a.splice(0, 1); out.push(show(a) + " " + show(r));
  a = [, ,]; r = a.splice(1, 0, "x"); out.push(show(a) + " " + show(r));
  a = [, , 3]; r = a.splice(0, 2, "a", "b", "c"); out.push(show(a) + " " + show(r));
  // The array is the same one, and usable afterwards.
  a = [5, 1, 4]; r = a.splice(1, 1); a.push(9); r.push(8); out.push(show(a) + " " + show(r), a.length + r.length);
  var q = [1, 2, 3, 4, 5, 6, 7, 8];
  while (q.length > 2) q.splice(1, 1);
  out.push(show(q));
  var sum = 0;
  var removed = [10, 20, 30, 40].splice(1, 2);
  for (var i = 0; i < removed.length; i++) sum += removed[i];
  out.push(sum);
  // toSpliced.
  var b = [1, 2, 3, 4, 5];
  out.push(show(b.toSpliced()), show(b.toSpliced(2)), show(b.toSpliced(undefined)), show(b.toSpliced(-2)), show(b.toSpliced(-9)), show(b.toSpliced(9)));
  out.push(show(b.toSpliced(1, undefined)), show(b.toSpliced(1, 2)), show(b.toSpliced(1, -1)), show(b.toSpliced(1, 99)), show(b.toSpliced(1, Infinity)), show(b.toSpliced(-Infinity, 1)));
  out.push(show(b.toSpliced(1, 2, "x")), show(b.toSpliced(1, 0, "x", "y")), show(b.toSpliced(5, 0, "x")), show(b.toSpliced(Infinity, 3, "x")), show(b.toSpliced(0, 5, "x", undefined, -0)), show(b.toSpliced("1", "1", "s")), show(b.toSpliced(1.9, 1.9)), show(b.toSpliced(NaN, NaN, 0)), show(b.toSpliced(-1, 1, "end")));
  out.push(show(b), b.toSpliced(0, 0) !== b, show([].toSpliced(0, 1, "x")), show([].toSpliced()));
  var h = [1, , 3, , 5, ,];
  out.push(show(h.toSpliced()), show(h.toSpliced(1, 2)), show(h.toSpliced(0, 0, "x")), show(h.toSpliced(5)), show(h.toSpliced(4, 1, "y")), show(h), 1 in h.toSpliced(), 1 in h);
  // copyWithin.
  function cw() {
    var c = [1, 2, 3, 4, 5, 6];
    var res = c.copyWithin.apply(c, arguments);
    return show(c) + (res === c);
  }
  out.push(show([1, 2, 3, 4, 5].copyWithin(0, 3)), show([1, 2, 3, 4, 5].copyWithin(0, 3, 4)), show([1, 2, 3, 4, 5].copyWithin(-2)), show([1, 2, 3, 4, 5].copyWithin(-2, -3, -1)), show([1, 2, 3, 4, 5].copyWithin(1, 0)), show([1, 2, 3, 4, 5].copyWithin(2, 0, 4)), show([1, 2, 3, 4, 5].copyWithin(0, 1)));
  out.push(show([1, 2, 3, 4, 5].copyWithin()), show([1, 2, 3, 4, 5].copyWithin(1)), show([1, 2, 3, 4, 5].copyWithin(undefined, 2)), show([1, 2, 3, 4, 5].copyWithin(0, 1, undefined)), show([1, 2, 3, 4, 5].copyWithin(0, 1, null)), show([1, 2, 3, 4, 5].copyWithin(9, 0)), show([1, 2, 3, 4, 5].copyWithin(0, 9)), show([1, 2, 3, 4, 5].copyWithin(0, 3, 1)));
  out.push(show([1, 2, 3, 4, 5].copyWithin(Infinity, 0)), show([1, 2, 3, 4, 5].copyWithin(-Infinity, 2)), show([1, 2, 3, 4, 5].copyWithin(0, -Infinity, Infinity)), show([1, 2, 3, 4, 5].copyWithin(1, NaN, 2.9)), show([1, 2, 3, 4, 5].copyWithin("1", "3")), show([1, 2, 3, 4, 5].copyWithin(-1.5, 0)), show([1, 2, 3, 4, 5].copyWithin(3, 0, 5)), show([1, 2, 3, 4, 5].copyWithin(0, -1, -9)));
  out.push(show([1, , 3, , 5, 6].copyWithin(0, 1)), show([1, , 3, , 5, 6].copyWithin(1, 0)), show([1, , 3, , 5, 6].copyWithin(2, 0, 3)), show([, , , 4].copyWithin(0, 3)), show([1, 2, 3, ,].copyWithin(0, 3)), show([].copyWithin(0, 1)));
  var same = [1, 2, 3];
  out.push(same.copyWithin(1, 0) === same, show(same), cw(0, 2), cw(2, 0), cw(1, 3, 5), cw(-1, 0));
  // with.
  var w = [1, 2, 3];
  out.push(show(w.with(0, "a")), show(w.with(2, "c")), show(w.with(-1, "z")), show(w.with(-3, "f")), show(w.with("1", "s")), show(w.with(1.9, "t")), show(w.with(-0.5, "m")), show(w.with(NaN, "n")), show(w.with(undefined, "u")), show(w.with(null, "l")), show(w.with(-0, -0)), show(w.with(1)), show(w.with()), show(w.with(true, "b")));
  out.push(show(w), w.with(0, 1) !== w, show([1, , 3, ,].with(0, "x")), show([1, , 3, ,].with(1, "x")), show([1, , 3, ,].with(-1, "x")), 1 in [1, , 3].with(0, 0), show(w.with(1, [9]).with(0, w.length)));
  // Runtime content and a runtime index.
  var d = [input, 2, input + 1, 4];
  var dr = d.splice(1, 2, "x");
  out.push(d, dr, d.length, [1, input, 3].toSpliced(1, 1, "y", input), [input, 1, 2, 3].copyWithin(1, 0), [1, 2, 3].with(1, input));
  var e = [1, 2, 3, 4];
  var er = e.splice(input, 1);
  out.push(e, er, [1, 2, 3, 4].toSpliced(input, 1, "k"), [1, 2, 3, 4].copyWithin(input, 0), [1, 2, 3, 4, 5, 6, 7, 8].with(input, "w"));
  return out;
}
