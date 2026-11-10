function main(b) {
  let a, c;
  if (0 < b) {
    a = [b, 1, 0];
    c = a;
    while (a[1] < a[0]) {
      a[1] = a[1];
      a[2] = a[2] + a[1];
      a[1] = a[1] + 1;
    }
    return c[2];
  }
  return 0;
}
