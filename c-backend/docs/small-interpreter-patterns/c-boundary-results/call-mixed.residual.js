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
  let b, c, a, d, f;
  b = {};
  b.value = __mk0(b);
  c = {code: ["add", ["arg", 0], ["arg", 0]], args: [0]};
  a = 0;
  d = 0;
  while (a < e) {
    c.args[0] = a;
    f = (0 , b.value)(c.code, c.args);
    a += 1;
    d += f;
  }
  return d;
}
