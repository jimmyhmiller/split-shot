--- residual as JavaScript ---
function __rf0(g, h, i, d, f, e, a, b) {
  let c;
  a: {
    if (b >= a.length) {
      c = hostGet(d, e);
      break a;
    }
    if (f === a[b]) {
      c = hostSlot(d, (0 , i.value)(h.value[a[b]], e));
      break a;
    }
    c = (0 , g.value)(d, f, e, a, b + 1);
  }
  return c;
}

function __mk0(c0, c1, c2) {
  return function guarded(a, b, c, d, e) { return new.target ? Reflect.construct(__rf0, [c0, c1, c2, ...arguments], new.target) : __rf0.call(this, c0, c1, c2, ...arguments); };
}

var __rf1 = function slotOf(b, c) {
  let a;
  a = 0;
  while (a < b.keys.length) {
    if (b.keys[a] === c) {
      return a;
    }
    a += 1;
  }
  return -1;
};

function entry(r) {
  let g, m, d, e, f, n, a, h, o, i, j, k, c, l, b, p, q;
  a: {
    g = hostObject(r);
    m = hostShapeOf(g);
    if (m === 2) {
      q = hostSlot(g, 0);
      d = {};
      e = {};
      f = {};
      n = __mk0(d, e, f);
      a = [];
      h = {};
      o = [];
      i = {};
      j = [];
      k = {};
      c = [];
      l = {};
      b = [];
      p = __rf1;
      h.keys = o;
      a[0] = h;
      j[0] = "x";
      i.keys = j;
      a[1] = i;
      c[0] = "x";
      c[1] = "y";
      k.keys = c;
      a[2] = k;
      b[0] = "y";
      b[1] = "tag";
      b[2] = "x";
      l.keys = b;
      a[3] = l;
      e.value = a;
      f.value = p;
      d.value = n;
      break a;
    }
    d = {};
    e = {};
    f = {};
    n = __mk0(d, e, f);
    a = [];
    h = {};
    o = [];
    i = {};
    j = [];
    k = {};
    c = [];
    l = {};
    b = [];
    p = __rf1;
    h.keys = o;
    a[0] = h;
    j[0] = "x";
    i.keys = j;
    a[1] = i;
    c[0] = "x";
    c[1] = "y";
    k.keys = c;
    a[2] = k;
    b[0] = "y";
    b[1] = "tag";
    b[2] = "x";
    l.keys = b;
    a[3] = l;
    e.value = a;
    f.value = p;
    d.value = n;
    q = __rf0(d, e, f, g, m, "x", [2, 3], 1);
  }
  m = hostShapeOf(g);
  return q + n(g, m, "y", [2, 3], 0);
}
