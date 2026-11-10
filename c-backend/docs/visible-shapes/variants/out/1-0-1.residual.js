function entry(b) {
  let a, d, c;
  a = hostArg(b, 0);
  hostShapeOf(a);
  d = a;
  a = hostArg(b, 1);
  hostShapeOf(a);
  c = hostThis(b);
  hostAdd(c, 2, 0, d);
  hostAdd(c, 4, 1, a);
  hostExit(4);
  return 0;
}
