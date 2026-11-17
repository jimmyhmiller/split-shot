function __mk1(f, g) {
  return function emit(a, b, e, h) {
    let c, d;
    a: {
      c = h;
      if (b === a.length) {
        c.push(e);
        break a;
      }
      d = (0 , g.value)(a[b], e);
      if (d !== null) {
        (0 , f.value)(a, b + 1, d, c);
        break a;
      }
      return;
    }
  };
}

function main(b) {
  let a, f, c, d, e;
  a = 0;
  f = ["lower-sub", "strength-reduce", "remove-identities"];
  c = [];
  d = {};
  e = __mk1(d, {value: function rewrite(c, b) {
  let a, d;
  a = c === "lower-sub";
  if (a ? b.op === "sub" : c === "lower-sub") {
    return {op: "add", arg: -b.arg | 0};
  }
  a = c === "strength-reduce";
  a = a ? b.op === "mul" : c === "strength-reduce";
  d = a ? b.arg === 2 : void 0;
  if (a ? d : a) {
    return {op: "shl", arg: 1};
  }
  a = c === "remove-identities";
  a = a ? b.op === "add" : c === "remove-identities";
  d = a ? b.arg === 0 : void 0;
  if (a ? d : a) {
    return null;
  }
  return b;
}});
  d.value = e;
  while (a < b.length) {
    e(f, 0, b[a], c);
    a += 1;
  }
  return c;
}
