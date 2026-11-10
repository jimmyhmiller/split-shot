function entry(h) {
  let e, c, a, b, d, g, f, i;
  e = hostThis(h);
  c = hostShapeOf(e);
  a: {
    if (c === 3) {
      a = 0;
      break a;
    }
    a = -1;
  }
  if (c === 5) {
    a = 0;
  }
  if (a < 0) {
    b = hostShapeOf(e);
    b: {
      if (b === 3) {
        a = 0;
        break b;
      }
      a = -1;
    }
    if (b === 5) {
      a = 0;
    }
  }
  d = hostLoad(e, a, "pos");
  a = hostShapeOf(d);
  b = a === 0 ? 2 : -1;
  b = a === 2 ? 2 : b;
  b = a === 4 ? 2 : b;
  g = b;
  b = a === 0 ? 0 : -1;
  b = a === 2 ? 2 : b;
  b = a === 4 ? 4 : b;
  c: {
    if (g < 0) {
      a = hostShapeOf(d);
      b = a === 0 ? 2 : -1;
      b = a === 2 ? 2 : b;
      b = a === 4 ? 2 : b;
      g = b;
      b = a === 0 ? 0 : -1;
      b = a === 2 ? 2 : b;
      b = a === 4 ? 4 : b;
      f = b;
      break c;
    }
    f = b;
  }
  d: {
    i = hostCall;
    if (c === 5) {
      a = 1;
      break d;
    }
    a = -1;
  }
  if (a < 0) {
    b = hostShapeOf(e);
    e: {
      if (b === 5) {
        a = 1;
        break e;
      }
      a = -1;
    }
  }
  b = d;
  d = hostLoad(e, a, "vel");
  hostShapeOf(d);
  b = i(g, f, 0, "add", b, [d]);
  hostShapeOf(b);
  f: {
    if (c === 3) {
      a = 0;
      break f;
    }
    a = -1;
  }
  if (c === 5) {
    a = 0;
  }
  c = [c];
  d = [0];
  if (a >= 0) {
    hostStore(e, a, b);
    hostExit(c[0]);
    return 0;
  }
  g: {
    if (d[0]) {
      a = {"0:x": 2, "1:pos": 3, "2:y": 4, "3:vel": 5}[c[0] + ":" + "pos"];
      break g;
    }
    a = void 0;
  }
  h: {
    g = c;
    if (a !== void 0) {
      d = ([{cls: 0, keys: []}, {cls: 1, keys: []}, {cls: 0, keys: ["x"]}, {cls: 1, keys: ["pos"]}, {cls: 0, keys: ["x", "y"]}, {cls: 1, keys: ["pos", "vel"]}][a]).keys;
      f = 0;
      while (f < d.length) {
        if (d[f] === "pos") {
          hostAdd(e, a, f, b);
          c[0] = a;
          break h;
        }
        f += 1;
      }
      hostAdd(e, a, -1, b);
      c[0] = a;
      break h;
    }
    if (d[0]) {
      hostNeedShape(c[0], "pos");
    }
    hostSetGeneric(e, "pos", b);
    d[0] = 0;
  }
  hostExit(g[0]);
  return 0;
}
