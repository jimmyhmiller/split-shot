function entry(j) {
  let e, i, g, h, k, l, a, b, c, d, f;
  e = hostArg(j, 0);
  i = hostShapeOf(e);
  g = hostThis(j);
  h = hostShapeOf(g);
  k = hostNew(0, 2);
  a: {
    l = hostCall;
    if (h === 2) {
      a = 0;
      break a;
    }
    a = -1;
  }
  if (h === 4) {
    a = 0;
  }
  if (a < 0) {
    b = hostShapeOf(g);
    b: {
      if (b === 2) {
        a = 0;
        break b;
      }
      a = -1;
    }
    if (b === 4) {
      a = 0;
    }
  }
  c = hostLoad(g, a, "x");
  d = hostShapeOf(c);
  c: {
    if (i === 2) {
      a = 0;
      break c;
    }
    a = -1;
  }
  if (i === 4) {
    a = 0;
  }
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
  }
  e: {
    b = c;
    c = hostLoad(e, a, "x");
    a = d;
    d = hostShapeOf(c);
    if (a === -1 & d === -1) {
      f = b + c;
      break e;
    }
    b = hostArith("+", b, c);
    f = b;
  }
  f: {
    if (a === -1 & d === -1) {
      break f;
    }
    hostShapeOf(f);
  }
  g: {
    if (h === 4) {
      a = 1;
      break g;
    }
    a = -1;
  }
  if (a < 0) {
    b = hostShapeOf(g);
    h: {
      if (b === 4) {
        a = 1;
        break h;
      }
      a = -1;
    }
  }
  c = hostLoad(g, a, "y");
  d = hostShapeOf(c);
  i: {
    if (i === 4) {
      a = 1;
      break i;
    }
    a = -1;
  }
  if (a < 0) {
    b = hostShapeOf(e);
    j: {
      if (b === 4) {
        a = 1;
        break j;
      }
      a = -1;
    }
  }
  k: {
    b = c;
    c = hostLoad(e, a, "y");
    a = d;
    d = hostShapeOf(c);
    if (a === -1 & d === -1) {
      e = f;
      f = b + c;
      break k;
    }
    b = hostArith("+", b, c);
    e = f;
    f = b;
  }
  l: {
    if (a === -1 & d === -1) {
      break l;
    }
    hostShapeOf(f);
  }
  l(1, 0, 1, "", k, [e, f]);
  hostExit(h);
  return k;
}
