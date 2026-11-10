function entry(g) {
  let d, b, a, c, e, f, h;
  d = hostThis(g);
  b = hostShapeOf(d);
  a: {
    if (b === 3) {
      a = 0;
      break a;
    }
    a = -1;
  }
  if (b === 5) {
    a = 0;
  }
  c = hostLoad(d, a, "pos");
  b = hostShapeOf(c);
  a = b === 0 ? 2 : -1;
  a = b === 2 ? 2 : a;
  a = b === 4 ? 2 : a;
  e = a;
  a = b === 0 ? 0 : -1;
  a = b === 2 ? 2 : a;
  a = b === 4 ? 4 : a;
  b: {
    if (e < 0) {
      b = hostShapeOf(c);
      a = b === 0 ? 2 : -1;
      a = b === 2 ? 2 : a;
      a = b === 4 ? 2 : a;
      e = a;
      a = b === 0 ? 0 : -1;
      a = b === 2 ? 2 : a;
      a = b === 4 ? 4 : a;
      f = a;
      break b;
    }
    f = a;
  }
  h = hostCall;
  b = hostShapeOf(d);
  c: {
    if (b === 5) {
      a = 1;
      break c;
    }
    a = -1;
  }
  b = c;
  c = hostLoad(d, a, "vel");
  hostShapeOf(c);
  b = h(e, f, 0, "add", b, [c]);
  hostShapeOf(b);
  hostSetGeneric(d, "pos", b);
  hostExit(1);
  return 0;
}
