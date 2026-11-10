function entry(h) {
  let e, g, i, j, k, b, d, a, c, f;
  e = hostArg(h, 0);
  g = hostShapeOf(e);
  i = hostThis(h);
  j = hostNew(0, 2);
  k = hostCall;
  b = hostLoad(i, 0, "x");
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
  b = hostLoad(i, 1, "y");
  d = hostShapeOf(b);
  e: {
    if (g === 4) {
      a = 1;
      break e;
    }
    a = -1;
  }
  if (a < 0) {
    c = hostShapeOf(e);
    f: {
      if (c === 4) {
        a = 1;
        break f;
      }
      a = -1;
    }
  }
  g: {
    c = b;
    b = hostLoad(e, a, "y");
    a = d;
    d = hostShapeOf(b);
    if (a === -1 & d === -1) {
      e = f;
      f = c + b;
      break g;
    }
    b = hostArith("+", c, b);
    e = f;
    f = b;
  }
  h: {
    if (a === -1 & d === -1) {
      break h;
    }
    hostShapeOf(f);
  }
  k(1, 0, 1, "", j, [e, f]);
  hostExit(4);
  return j;
}
