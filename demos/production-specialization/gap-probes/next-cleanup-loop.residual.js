function __mk0(c) {
  return (b) => {
    let a;
    a: {
      if (typeof b === "string") {
        a = new RegExp("^" + `${c.value}`);
        a = b.replace(a, "");
        break a;
      }
      a = b;
    }
    return a;
  };
}

function main(f) {
  let g, e, h, a, c, d, b;
  g = (Object.entries(f)[Symbol.iterator])();
  e = {};
  h = {value: "_NEXTSEP_"};
  while (true) {
    a = g.next();
    if (a.done) {
      return e;
    }
    a: {
      a = (a.value[Symbol.iterator])();
      c = a.next();
      if (c.done) {
        d = true;
        c = void 0;
        break a;
      }
      c = c.value;
      d = false;
    }
    b: {
      if (!d) {
        b = a.next();
        if (b.done) {
          d = true;
          b = void 0;
          break b;
        }
        b = b.value;
        break b;
      }
      b = void 0;
    }
    if (!d) {
      a.return != null && a.return();
    }
    if (typeof b === "string") {
      a = /^_NEXTSEP_/;
      e[c] = b.replace(a, "");
      continue;
    }
    if (Array.isArray(b)) {
      d = b.map;
      a = __mk0(h);
      e[c] = d.call(b, a);
      continue;
    }
    e[c] = b;
  }
}
