function main(c) {
  let d, g, a, e, f, b;
  d = {};
  if (c.team !== void 0) {
    d.team = c.team;
  }
  if (c.project !== void 0) {
    d.project = c.project;
  }
  if (c.path !== void 0) {
    d.path = c.path;
  }
  d = (Object.entries(d)[Symbol.iterator])();
  g = {};
  while (true) {
    a = d.next();
    if (a.done) {
      return g;
    }
    a: {
      a = (a.value[Symbol.iterator])();
      e = a.next();
      if (e.done) {
        f = true;
        e = void 0;
        break a;
      }
      e = e.value;
      f = false;
    }
    b: {
      if (!f) {
        b = a.next();
        if (b.done) {
          f = true;
          b = void 0;
          break b;
        }
        b = b.value;
        break b;
      }
      b = void 0;
    }
    if (!f) {
      a.return != null && a.return();
    }
    c: {
      if (typeof b === "string") {
        a = b.replace(/^_NEXTSEP_/, "");
        break c;
      }
      a = b;
    }
    g[e] = a;
  }
}
