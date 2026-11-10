function main(a) {
  let b;
  b = {0: a, 1: 2, 2: 3}[a % 3];
  return (b === void 0 ? 0 : b) + 7;
}
