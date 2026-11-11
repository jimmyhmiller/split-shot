function __mk0(a) {
  return (b) => {
    return a(b);
  };
}

function __mk1(d) {
  return {decode: (e) => {
    let b, c, a;
    b = d;
    c = e;
    a = void 0;
    try {
      a = decodeURIComponent(c);
    } catch (__e) {
      throw new b.value.DecodeError("failed to decode param");
    }
    return a;
  }}.decode;
}

function __mk2(c) {
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

function main(z) {
  let i, g, a, b, j, k, h, l, c, m, v, d, n, o, e, p, A, w, q, x, r, s, y, f, t, B, C, u;
  i = host.nextUtils;
  g = (/^\/teams\/([^/]+?)\/projects\/([^/]+?)\/files\/(.+?)(?:\/)?$/).exec(z);
  if (!g) {
    return false;
  }
  a: {
    b: {
      a = g[1];
      b = {};
      if (a !== void 0) {
        k = {value: i};
        h = {value: i};
        l = a;
        c = void 0;
        try {
          j = decodeURIComponent(l);
          c = j;
        } catch (__e) {
          m = new h.value.DecodeError("failed to decode param");
          throw m;
        }
        b["team"] = c;
        a = g[2];
        if (a !== void 0) {
          v = h;
          l = a;
          c = void 0;
          try {
            j = decodeURIComponent(l);
            c = j;
          } catch (__e) {
            m = new h.value.DecodeError("failed to decode param");
            throw m;
          }
          b["project"] = c;
          a = g[3];
          if (a !== void 0) {
            d = a.split("/");
            n = d.map;
            e = __mk1(v);
            o = __mk0(e);
            p = n.call(d, o);
            b["path"] = p;
            break a;
          }
          e = __mk1(v);
          break a;
        }
        break b;
      }
      a = g[2];
      if (a !== void 0) {
        k = {value: i};
        h = {value: i};
        l = a;
        c = void 0;
        try {
          j = decodeURIComponent(l);
          c = j;
        } catch (__e) {
          m = new h.value.DecodeError("failed to decode param");
          throw m;
        }
        b["project"] = c;
        break b;
      }
      a = g[3];
      if (a !== void 0) {
        d = a.split("/");
        n = d.map;
        k = {value: i};
        e = __mk1(k);
        o = __mk0(e);
        p = n.call(d, o);
        b["path"] = p;
        break a;
      }
      k = {value: i};
      e = __mk1(k);
      break a;
    }
    a = g[3];
    if (a !== void 0) {
      d = a.split("/");
      n = d.map;
      e = __mk1(h);
      o = __mk0(e);
      p = n.call(d, o);
      b["path"] = p;
      break a;
    }
    e = __mk1(h);
  }
  if (!b) {
    return false;
  }
  A = (Object.entries(b)[Symbol.iterator])();
  t = {};
  C = {value: "_NEXTSEP_"};
  while (true) {
    w = A.next();
    if (w.done) {
      return t;
    }
    c: {
      q = (w.value[Symbol.iterator])();
      x = q.next();
      if (x.done) {
        s = true;
        r = void 0;
        break c;
      }
      r = x.value;
      s = false;
    }
    d: {
      if (!s) {
        y = q.next();
        if (y.done) {
          s = true;
          f = void 0;
          break d;
        }
        f = y.value;
        break d;
      }
      f = void 0;
    }
    if (!s) {
      q.return != null && q.return();
    }
    if (typeof f === "string") {
      u = /^_NEXTSEP_/;
      t[r] = f.replace(u, "");
      continue;
    }
    if (Array.isArray(f)) {
      B = f.map;
      u = __mk2(C);
      t[r] = B.call(f, u);
      continue;
    }
    t[r] = f;
  }
}
