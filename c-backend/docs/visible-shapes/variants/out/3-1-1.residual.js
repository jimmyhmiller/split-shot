function entry(b) {
  let a, d, c;
  a = hostArg(b, 0);
  hostShapeOf(a);
  d = a;
  a = hostArg(b, 1);
  hostShapeOf(a);
  c = hostThis(b);
  hostAdd(c, 3, 0, d);
  hostAdd(c, 5, 1, a);
  hostExit(5);
  return 0;
}
