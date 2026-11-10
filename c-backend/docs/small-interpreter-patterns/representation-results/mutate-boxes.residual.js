function entry(b) {
  let a, c;
  if (0 < b) {
    a = [{value: b}, {value: 1}, {value: 0}];
    c = a;
    while ((a[1]).value < (a[0]).value) {
      a[1] = a[1];
      (a[2]).value = (a[2]).value + (a[1]).value;
      (a[1]).value = (a[1]).value + 1;
    }
    return (c[2]).value;
  }
  return 0;
}
