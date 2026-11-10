function entry(c) {
  let a, d, b;
  if (0 < c) {
    a = [{value: c}, {value: 1}, {value: 0}];
    d = a;
    while ((a[1]).value < (a[0]).value) {
      a[1] = a[1];
      b = (a[2]).value + (a[1]).value;
      a[2] = {value: b};
      b = (a[1]).value + 1;
      a[1] = {value: b};
    }
    return (d[2]).value;
  }
  return 0;
}
