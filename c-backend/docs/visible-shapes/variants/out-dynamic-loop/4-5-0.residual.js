function entry(f) {
  let e, c, b, a, d, g;
  e = hostThis(f);
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
  g = c;
  c = hostLoad(e, 1, "vel");
  hostShapeOf(c);
  c = d(b, a, 0, "add", g, [c]);
  hostShapeOf(c);
  hostStore(e, 0, c);
  hostExit(5);
  return 0;
}
