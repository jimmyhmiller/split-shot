function entry(g) {
  let e, c, b, a, d, f, h;
  e = hostThis(g);
  c = hostLoad(e, 0, "pos");
  b = hostShapeOf(c);
  a = b === 0 ? 2 : -1;
  a = b === 2 ? 2 : a;
  a = b === 4 ? 2 : a;
  d = a;
  a = b === 0 ? 0 : -1;
  a = b === 2 ? 2 : a;
  a = b === 4 ? 4 : a;
  a: {
    if (d < 0) {
      b = hostShapeOf(c);
      a = b === 0 ? 2 : -1;
      a = b === 2 ? 2 : a;
      a = b === 4 ? 2 : a;
      d = a;
      a = b === 0 ? 0 : -1;
      a = b === 2 ? 2 : a;
      a = b === 4 ? 4 : a;
      b = d;
      break a;
    }
    b = d;
  }
  d = hostCall;
  f = hostShapeOf(e);
  b: {
    if (f === 5) {
      f = 1;
      break b;
    }
    f = -1;
  }
  h = c;
  c = hostLoad(e, f, "vel");
  hostShapeOf(c);
  c = d(b, a, 0, "add", h, [c]);
  hostShapeOf(c);
  hostStore(e, 0, c);
  hostExit(3);
  return 0;
}
