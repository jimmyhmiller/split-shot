function entry(i) {
  let e, g, h, j, k, b, d, a, c, f;
  e = hostArg(i, 0);
  g = hostShapeOf(e);
  h = hostThis(i);
  j = hostNew(0, 2);
  k = hostCall;
  b = hostLoad(h, 0, "x");
  d = hostShapeOf(b);
  a: {
    if (g === 2) {
      a = 0;
      break a;
    }
    a = -1;
  }
  if (g === 4) {
    a = 0;
  }
  if (a < 0) {
    c = hostShapeOf(e);
    b: {
      if (c === 2) {
        a = 0;
        break b;
      }
      a = -1;
    }
    if (c === 4) {
      a = 0;
    }
  }
  c: {
    c = b;
    b = hostLoad(e, a, "x");
    a = d;
    d = hostShapeOf(b);
    if (a === -1 & d === -1) {
      f = c + b;
      break c;
    }
    b = hostArith("+", c, b);
    f = b;
  }
  d: {
    if (a === -1 & d === -1) {
      break d;
    }
    hostShapeOf(f);
  }
  c = hostShapeOf(h);
  e: {
    if (c === 4) {
      a = 1;
      break e;
    }
    a = -1;
  }
  b = hostLoad(h, a, "y");
  d = hostShapeOf(b);
  f: {
    if (g === 4) {
      a = 1;
      break f;
    }
    a = -1;
  }
  if (a < 0) {
    c = hostShapeOf(e);
    g: {
      if (c === 4) {
        a = 1;
        break g;
      }
      a = -1;
    }
  }
  h: {
    c = b;
    b = hostLoad(e, a, "y");
    a = d;
    d = hostShapeOf(b);
    if (a === -1 & d === -1) {
      e = f;
      f = c + b;
      break h;
    }
    b = hostArith("+", c, b);
    e = f;
    f = b;
  }
  i: {
    if (a === -1 & d === -1) {
      break i;
    }
    hostShapeOf(f);
  }
  k(1, 0, 1, "", j, [e, f]);
  hostExit(2);
  return j;
}
