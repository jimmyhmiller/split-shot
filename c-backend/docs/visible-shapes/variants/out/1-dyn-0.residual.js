function __o0() {
  return {"0:x": 2, "1:pos": 3, "2:y": 4, "3:vel": 5};
}

function entry(m) {
  let h, d, k, a, g, c, e, l, f, b, i, j, p, n, o;
  h = hostArg(m, 0);
  d = hostShapeOf(h);
  k = h;
  h = hostArg(m, 1);
  a = d;
  d = hostShapeOf(h);
  g = hostThis(m);
  c = hostShapeOf(g);
  a: {
    if (c === 2) {
      e = 0;
      break a;
    }
    e = -1;
  }
  if (c === 4) {
    e = 0;
  }
  d = [a, d, c];
  a = [0, 0, 0];
  if (e >= 0) {
    hostStore(g, e, k);
    a[1] = 0;
    d[1];
    k = d[2];
    b: {
      if (k === 4) {
        e = 1;
        break b;
      }
      e = -1;
    }
    c: {
      k = d;
      if (e >= 0) {
        hostStore(g, e, h);
        break c;
      }
      d: {
        if (a[2]) {
          l = __o0();
          c = l[d[2] + ":" + "y"];
          break d;
        }
        c = void 0;
      }
      if (c !== void 0) {
        a = [];
        a = {cls: 0, keys: a};
        e = [];
        e = {cls: 1, keys: e};
        f = ["x"];
        f = {cls: 0, keys: f};
        b = ["pos"];
        b = {cls: 1, keys: b};
        i = ["x", "y"];
        i = {cls: 0, keys: i};
        j = ["pos", "vel"];
        j = {cls: 1, keys: j};
        f = [a, e, f, b, i, j];
        a = (f[c]).keys;
        b = 0;
        while (b < a.length) {
          if (a[b] === "y") {
            hostAdd(g, c, b, h);
            d[2] = c;
            break c;
          }
          b += 1;
        }
        hostAdd(g, c, -1, h);
        d[2] = c;
        break c;
      }
      c = a[2];
      if (c) {
        hostNeedShape(d[2], "y");
      }
      hostSetGeneric(g, "y", h);
      a[2] = 0;
    }
    hostExit(k[2]);
    return 0;
  }
  e: {
    if (a[2]) {
      l = __o0();
      c = l[d[2] + ":" + "x"];
      break e;
    }
    c = void 0;
    l = __o0();
  }
  f: {
    p = d;
    n = d;
    o = a;
    if (c !== void 0) {
      a = [];
      a = {cls: 0, keys: a};
      e = [];
      e = {cls: 1, keys: e};
      f = ["x"];
      f = {cls: 0, keys: f};
      b = ["pos"];
      b = {cls: 1, keys: b};
      i = ["x", "y"];
      i = {cls: 0, keys: i};
      j = ["pos", "vel"];
      j = {cls: 1, keys: j};
      f = [a, e, f, b, i, j];
      a = (f[c]).keys;
      b = 0;
      while (b < a.length) {
        if (a[b] === "x") {
          hostAdd(g, c, b, k);
          d[2] = c;
          break f;
        }
        b += 1;
      }
      hostAdd(g, c, -1, k);
      d[2] = c;
      break f;
    }
    c = a[2];
    if (c) {
      hostNeedShape(d[2], "x");
    }
    hostSetGeneric(g, "x", k);
    a[2] = 0;
    a = [];
    a = {cls: 0, keys: a};
    e = [];
    e = {cls: 1, keys: e};
    f = ["x"];
    f = {cls: 0, keys: f};
    b = ["pos"];
    b = {cls: 1, keys: b};
    i = ["x", "y"];
    i = {cls: 0, keys: i};
    j = ["pos", "vel"];
    j = {cls: 1, keys: j};
    f = [a, e, f, b, i, j];
  }
  o[1] = 0;
  n[1];
  k = n[2];
  e = -1;
  d = 0;
  g: while (d < f.length) {
    a = (f[d]).keys;
    b = 0;
    while (true) {
      h: {
        if (b < a.length) {
          if (a[b] === "y") {
            if (b >= 0) {
              if (k === d) {
                a = (f[d]).keys;
                b = 0;
                while (b < a.length) {
                  if (a[b] === "y") {
                    e = b;
                    break h;
                  }
                  b += 1;
                }
                e = -1;
                break h;
              }
              break h;
            }
            break h;
          }
          b += 1;
          continue;
        }
      }
      d += 1;
      continue g;
    }
  }
  i: {
    d = n;
    a = o;
    if (e >= 0) {
      hostStore(g, e, h);
      break i;
    }
    j: {
      if (a[2]) {
        c = l[d[2] + ":" + "y"];
        break j;
      }
      c = void 0;
    }
    if (c !== void 0) {
      a = (f[c]).keys;
      b = 0;
      while (b < a.length) {
        if (a[b] === "y") {
          hostAdd(g, c, b, h);
          d[2] = c;
          break i;
        }
        b += 1;
      }
      hostAdd(g, c, -1, h);
      d[2] = c;
      break i;
    }
    c = a[2];
    if (c) {
      hostNeedShape(d[2], "y");
    }
    hostSetGeneric(g, "y", h);
    a[2] = 0;
  }
  hostExit(p[2]);
  return 0;
}
