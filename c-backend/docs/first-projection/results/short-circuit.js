function main(a) {
  let b;
  if (a) {
    b = [1, 1, a, a];
    return b;
  }
  if (a === null || a === void 0) {
    b = [2, a, 1, 2];
    return b;
  }
  b = [1, a, 1, a];
  return b;
}
