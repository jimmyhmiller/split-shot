--- residual as JavaScript ---
function entry(e) {
  let c, a, b, d;
  c = hostObject(e);
  a = hostShapeOf(c);
  b = hostNoSlot();
  if (a === 2) {
    b = 0;
  }
  if (a === 3) {
    b = 2;
  }
  d = hostSlotOrGet(c, b, "x");
  a = hostShapeOf(c);
  b = hostNoSlot();
  if (a === 2) {
    b = 1;
  }
  if (a === 3) {
    b = 0;
  }
  a = d;
  d = hostSlotOrGet(c, b, "y");
  return a + d;
}
