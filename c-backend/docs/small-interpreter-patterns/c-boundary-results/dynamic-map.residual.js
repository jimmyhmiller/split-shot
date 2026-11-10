function entry(a) {
  let b;
  b = (new Map([[0, a], [1, 2], [2, 3]])).get(a % 3);
  return (b === void 0 ? 0 : b) + 7;
}
