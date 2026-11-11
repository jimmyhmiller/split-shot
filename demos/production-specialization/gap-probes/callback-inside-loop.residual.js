function __mk0(c) {
  return (b) => {
    let a;
    a: {
      if (typeof b === "string") {
        a = new RegExp("^" + c);
        a = b.replace(a, "");
        break a;
      }
      a = b;
    }
    return a;
  };
}

function main(b) {
  let c, a, d;
  c = [];
  a = 0;
  while (a < b.length) {
    c.push;
    d = (b[a]).map.call(b[a], __mk0("_NEXTSEP_"));
    c.push(d);
    a += 1;
  }
  return c;
}
