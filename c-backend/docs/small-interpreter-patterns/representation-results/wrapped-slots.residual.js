function entry(b) {
  let a, c;
  if (0 < b) {
    a = {values: [b, 1, 0]};
    c = a;
    while (a.values[1] < a.values[0]) {
      a.values = a.values;
      a.values[2] = a.values[2] + a.values[1];
      a.values[1] = a.values[1] + 1;
    }
    return c.values[2];
  }
  return 0;
}
