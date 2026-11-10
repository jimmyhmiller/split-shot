function entry(b) {
  let a;
  a = allocF64(3);
  a[0] = b;
  a[1] = 0;
  a[2] = 0;
  a[1] = 0;
  a[2] = 0;
  while (a[1] < a[0]) {
    a[1] = a[1];
    a[2] = a[2] + a[1];
    a[1] = a[1] + 1;
  }
  return a[2];
}
