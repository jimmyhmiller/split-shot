function main(a) {
  let b;
  b = [["x@" + (a - 0), a - 0]];
  b = new Map(b);
  if (b.has("x@" + (a - 0))) {
    b = b.get("x@" + (a - 0));
    return a - 0 + b;
  }
  b.set("x@" + (a - 0), a - 0);
  return a - 0 + (a - 0);
}
