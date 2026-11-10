function entry(g) {
  let b, f, a, c, d, e, h;
  b = hostArg(g, 0);
  hostShapeOf(b);
  f = hostThis(g);
  f = hostShapeOf(f);
  a = hostNew(1, 2);
  c = hostCall;
  d = a;
  e = a;
  a = hostNew(0, 2);
  hostCall(1, 0, 1, "", a, [1, 2]);
  h = a;
  a = hostNew(0, 2);
  hostCall(1, 0, 1, "", a, [b, 3]);
  c(3, 1, 1, "", e, [h, a]);
  b = hostCall(4, 5, 0, "step", d, []);
  hostShapeOf(b);
  b = hostCall(4, 5, 0, "step", d, []);
  hostShapeOf(b);
  b = hostCall(4, 5, 0, "step", d, []);
  hostShapeOf(b);
  b = hostLoad(d, 0, "pos");
  a = hostShapeOf(b);
  a: {
    if (a === 2) {
      c = 0;
      break a;
    }
    c = -1;
  }
  if (a === 4) {
    c = 0;
  }
  b: {
    if (c < 0) {
      a = hostShapeOf(b);
      c: {
        if (a === 2) {
          c = 0;
          break c;
        }
        c = -1;
      }
      if (a === 4) {
        c = 0;
      }
      a = c;
      break b;
    }
    a = c;
  }
  b = hostLoad(b, a, "x");
  a = hostShapeOf(b);
  e = b;
  b = hostLoad(d, 0, "pos");
  d = a;
  a = hostShapeOf(b);
  d: {
    if (a === 4) {
      c = 1;
      break d;
    }
    c = -1;
  }
  e: {
    if (c < 0) {
      a = hostShapeOf(b);
      f: {
        if (a === 4) {
          c = 1;
          break f;
        }
        c = -1;
      }
      a = c;
      break e;
    }
    a = c;
  }
  g: {
    b = hostLoad(b, a, "y");
    a = hostShapeOf(b);
    if (d === -1 & a === -1) {
      b = e + b;
      break g;
    }
    b = hostArith("+", e, b);
  }
  h: {
    if (d === -1 & a === -1) {
      break h;
    }
    hostShapeOf(b);
  }
  hostExit(f);
  return b;
}
