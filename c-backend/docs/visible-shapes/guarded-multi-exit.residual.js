--- residual as JavaScript ---
function entry(e) {
  let b, a, c, d;
  b = hostObject(e);
  a = hostShapeOf(b);
  a: {
    if (a === 2) {
      c = hostSlot(b, 0);
      a = hostShapeOf(b);
      break a;
    }
    if (a === 3) {
      c = hostSlot(b, 2);
      a = hostShapeOf(b);
      break a;
    }
    d = hostGet(b, "x");
    a = hostShapeOf(b);
    if (a === 2) {
      c = hostSlot(b, 1);
      return d + c;
    }
    if (a === 3) {
      c = hostSlot(b, 0);
      return d + c;
    }
    a = d;
    d = hostGet(b, "y");
    return a + d;
  }
  if (a === 2) {
    a = c;
    c = hostSlot(b, 1);
    return a + c;
  }
  if (a === 3) {
    a = c;
    c = hostSlot(b, 0);
    return a + c;
  }
  d = hostGet(b, "y");
  return c + d;
}
