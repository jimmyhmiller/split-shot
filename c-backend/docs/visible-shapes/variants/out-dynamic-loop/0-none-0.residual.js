function entry(f) {
  let c, b, a, d, e, g, h;
  c = hostArg(f, 0);
  b = hostShapeOf(c);
  hostThis(f);
  a = hostNew(1, 2);
  d = hostCall;
  e = a;
  g = a;
  a = hostNew(0, 2);
  hostCall(1, 0, 1, "", a, [1, 2]);
  h = a;
  a = hostNew(0, 2);
  hostCall(1, 0, 1, "", a, [c, 3]);
  d(3, 1, 1, "", g, [h, a]);
  a = 0;
  while (true) {
    a: {
      if (true & b === -1) {
        d = a < c;
        d = d ? 1 : 0;
        break a;
      }
      d = hostArith("<", a, c);
    }
    b: {
      if (true & b === -1) {
        break b;
      }
      hostShapeOf(d);
    }
    if (d) {
      d = hostCall(4, 5, 0, "step", e, []);
      hostShapeOf(d);
      a += 1;
      continue;
    }
    c = hostLoad(e, 0, "pos");
    b = hostShapeOf(c);
    c: {
      if (b === 2) {
        a = 0;
        break c;
      }
      a = -1;
    }
    if (b === 4) {
      a = 0;
    }
    d: {
      if (a < 0) {
        b = hostShapeOf(c);
        e: {
          if (b === 2) {
            a = 0;
            break e;
          }
          a = -1;
        }
        if (b === 4) {
          a = 0;
        }
        b = a;
        break d;
      }
      b = a;
    }
    c = hostLoad(c, b, "x");
    b = hostShapeOf(c);
    d = c;
    c = hostLoad(e, 0, "pos");
    e = b;
    b = hostShapeOf(c);
    f: {
      if (b === 4) {
        a = 1;
        break f;
      }
      a = -1;
    }
    g: {
      if (a < 0) {
        b = hostShapeOf(c);
        h: {
          if (b === 4) {
            a = 1;
            break h;
          }
          a = -1;
        }
        b = a;
        break g;
      }
      b = a;
    }
    i: {
      c = hostLoad(c, b, "y");
      b = hostShapeOf(c);
      if (e === -1 & b === -1) {
        d += c;
        break i;
      }
      d = hostArith("+", d, c);
    }
    j: {
      if (e === -1 & b === -1) {
        break j;
      }
      hostShapeOf(d);
    }
    hostExit(-2);
    return d;
  }
}
