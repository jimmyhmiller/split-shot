function entry(i) {
  let e, h, g, j, k, b, a, c, d, f;
  e = hostArg(i, 0);
  h = hostShapeOf(e);
  g = hostThis(i);
  j = hostNew(0, 2);
  k = hostCall;
  b = hostShapeOf(g);
  a: {
    if (b === 2) {
      a = 0;
      break a;
    }
    a = -1;
  }
  if (b === 4) {
    a = 0;
  }
  c = hostLoad(g, a, "x");
  d = hostShapeOf(c);
  b: {
    if (h === 2) {
      a = 0;
      break b;
    }
    a = -1;
  }
  if (h === 4) {
    a = 0;
  }
  c: {
    if (a < 0) {
      b = hostShapeOf(e);
      d: {
        if (b === 2) {
          a = 0;
          break d;
        }
        a = -1;
      }
      if (b === 4) {
        a = 0;
      }
      b = a;
      break c;
    }
    b = a;
  }
  e: {
    a = c;
    c = hostLoad(e, b, "x");
    b = d;
    d = hostShapeOf(c);
    if (b === -1 & d === -1) {
      f = a + c;
      break e;
    }
    a = hostArith("+", a, c);
    f = a;
  }
  f: {
    if (b === -1 & d === -1) {
      break f;
    }
    hostShapeOf(f);
  }
  b = hostShapeOf(g);
  g: {
    if (b === 4) {
      a = 1;
      break g;
    }
    a = -1;
  }
  c = hostLoad(g, a, "y");
  d = hostShapeOf(c);
  h: {
    if (h === 4) {
      a = 1;
      break h;
    }
    a = -1;
  }
  i: {
    if (a < 0) {
      b = hostShapeOf(e);
      j: {
        if (b === 4) {
          a = 1;
          break j;
        }
        a = -1;
      }
      b = a;
      break i;
    }
    b = a;
  }
  k: {
    a = c;
    c = hostLoad(e, b, "y");
    b = d;
    d = hostShapeOf(c);
    if (b === -1 & d === -1) {
      e = f;
      f = a + c;
      break k;
    }
    a = hostArith("+", a, c);
    e = f;
    f = a;
  }
  l: {
    if (b === -1 & d === -1) {
      break l;
    }
    hostShapeOf(f);
  }
  k(1, 0, 1, "", j, [e, f]);
  hostExit(0);
  return j;
}
