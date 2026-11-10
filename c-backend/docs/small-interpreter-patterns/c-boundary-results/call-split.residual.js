function __mk0(c) {
  return function evaluate(a, b) {
    if (a[0] === "arg") {
      return b[a[1]];
    }
    if (a[0] === "add") {
      return (0 , c.value)(a[1], b) + (0 , c.value)(a[2], b);
    }
    return 0;
  };
}

function entry(e) {
  let b, f, d, a, c, g;
  b = {};
  b.value = __mk0(b);
  f = ["add", ["arg", 0], ["arg", 0]];
  d = {args: [0]};
  a = 0;
  c = 0;
  while (a < e) {
    d.args[0] = a;
    g = (0 , b.value)(f, d.args);
    a += 1;
    c += g;
  }
  return c;
}
