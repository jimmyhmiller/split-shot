var __s0 = "Cannot destructure a null or undefined value";

function __o0() {
  return {source: "/legacy/:slug", destination: "/articles/:slug"};
}
function __o1() {
  return {source: "/docs/:section/:page", destination: "/manual/:section/:page.html"};
}
function __o2() {
  return {source: "/user/:id", destination: "/profiles/:id.html"};
}
function __o3() {
  return {source: "/download/:file", destination: "/assets/:file"};
}
function __o4() {
  return {source: "/articles/:slug", destination: "/content/:slug.html"};
}

function __rf0(f, i, j, e, g, h) {
  let c, d, a, b;
  c = g === void 0 ? [] : g;
  d = c.slice();
  if (d.length === 0) {
    return h ? e : null;
  }
  a = 0;
  while (a < d.length) {
    b = c[a];
    if (b == null) {
      throw new TypeError(__s0);
    }
    b = j(b.source, b.destination, e);
    if (b) {
      d.splice(a, 1);
      c = f.value;
      a = i(b);
      return c.call(f, a, d, true);
    }
    a += 1;
  }
  return h ? e : null;
}

function __mk0(c0, c1, c2) {
  return {applyRewrites(a) { return __rf0.call(this, c0, c1, c2, ...arguments); }}.applyRewrites;
}

function __mk1(h, i, j, k) {
  return {toTarget: (l, d, m) => {
    let b, e, a, f, c, g;
    b = j(l, m, true);
    if (!b) {
      return null;
    }
    e = b.keys;
    b = b.results;
    a = k.parse(d);
    if (a == null) {
      throw new TypeError(__s0);
    }
    a: {
      if (a.protocol) {
        a = d;
        break a;
      }
      a = i(d);
    }
    a = h.compile(a);
    f = {};
    c = 0;
    while (c < e.length) {
      g = e[c];
      if (g == null) {
        throw new TypeError(__s0);
      }
      f[g.name] = b[c + 1];
      c += 1;
    }
    return a(f);
  }}.toTarget;
}

function __mk2(e, f, g, h) {
  return {sourceMatches: (i, j, k) => {
    let a, d, c, b;
    a: {
      a = h(i);
      d = f.posix.resolve(j);
      c = [];
      if (k) {
        b = g(a.replace("*", "(.*)"), c).exec(d);
        if (!b) {
          c.length = 0;
        }
        break a;
      }
      b = null;
    }
    b: {
      if (b) {
        a = b;
        break b;
      }
      a = e(d, a);
    }
    if (a) {
      a = {keys: c, results: b};
      return a;
    }
    return null;
  }}.sourceMatches;
}

function main(n) {
  let b, l, g, m, k, a, d, c, e, i, j, p, o, f, h;
  b = host.path;
  l = host.url;
  g = host.slasher;
  m = host.minimatch;
  k = host.pathToRegExp;
  a = g("/legacy/:slug");
  d = b.posix.resolve(n);
  c = a.replace("*", "(.*)");
  e = [];
  c = k(c, e);
  c = c.exec(d);
  if (!c) {
    e.length = 0;
  }
  a: {
    if (c) {
      a = c;
      break a;
    }
    a = m(d, a);
  }
  if (a) {
    a = l.parse("/articles/:slug");
    if (a == null) {
      b = new TypeError(__s0);
      throw b;
    }
    b: {
      a = a.protocol;
      if (a) {
        a = "/articles/:slug";
        break b;
      }
      a = g("/articles/:slug");
    }
    a = k.compile(a);
    d = {};
    f = 0;
    while (f < e.length) {
      h = e[f];
      if (h == null) {
        b = new TypeError(__s0);
        throw b;
      }
      h = h.name;
      d[h] = c[f + 1];
      f += 1;
    }
    a = a(d);
    if (a) {
      d = __o0();
      c = __o1();
      e = __o2();
      i = __o3();
      j = __o4();
      i = [d, c, e, i, j];
      i.splice(0, 1);
      j = g(a);
      p = i.slice();
      if (p.length === 0) {
        return j;
      }
      o = 0;
      while (o < p.length) {
        a = i[o];
        if (a == null) {
          throw new TypeError(__s0);
        }
        d = a.source;
        f = a.destination;
        a = g(d);
        d = b.posix.resolve(j);
        c = a.replace("*", "(.*)");
        e = [];
        c = k(c, e);
        c = c.exec(d);
        if (!c) {
          e.length = 0;
        }
        c: {
          if (c) {
            a = c;
            break c;
          }
          a = m(d, a);
        }
        if (a) {
          a = l.parse(f);
          if (a == null) {
            b = new TypeError(__s0);
            throw b;
          }
          d: {
            a = a.protocol;
            if (a) {
              a = f;
              break d;
            }
            a = g(f);
          }
          a = k.compile(a);
          d = {};
          f = 0;
          while (f < e.length) {
            h = e[f];
            if (h == null) {
              b = new TypeError(__s0);
              throw b;
            }
            h = h.name;
            d[h] = c[f + 1];
            f += 1;
          }
          a = a(d);
          if (a) {
            p.splice(o, 1);
            j = g(a);
            a = {};
            b = __mk2(m, b, k, g);
            b = __mk1(k, g, b, l);
            l = __mk0(a, g, b);
            a.value = l;
            b = __rf0(a, g, b, j, p, true);
            return b;
          }
        }
        o += 1;
      }
      return j;
    }
  }
  a = g("/docs/:section/:page");
  d = b.posix.resolve(n);
  c = a.replace("*", "(.*)");
  e = [];
  c = k(c, e);
  c = c.exec(d);
  if (!c) {
    e.length = 0;
  }
  e: {
    if (c) {
      a = c;
      break e;
    }
    a = m(d, a);
  }
  if (a) {
    a = l.parse("/manual/:section/:page.html");
    if (a == null) {
      b = new TypeError(__s0);
      throw b;
    }
    f: {
      a = a.protocol;
      if (a) {
        a = "/manual/:section/:page.html";
        break f;
      }
      a = g("/manual/:section/:page.html");
    }
    a = k.compile(a);
    d = {};
    f = 0;
    while (f < e.length) {
      h = e[f];
      if (h == null) {
        b = new TypeError(__s0);
        throw b;
      }
      h = h.name;
      d[h] = c[f + 1];
      f += 1;
    }
    a = a(d);
    if (a) {
      d = __o0();
      c = __o1();
      e = __o2();
      i = __o3();
      j = __o4();
      i = [d, c, e, i, j];
      i.splice(1, 1);
      j = g(a);
      a = {};
      b = __mk2(m, b, k, g);
      b = __mk1(k, g, b, l);
      l = __mk0(a, g, b);
      a.value = l;
      b = __rf0(a, g, b, j, i, true);
      return b;
    }
  }
  a = g("/user/:id");
  d = b.posix.resolve(n);
  c = a.replace("*", "(.*)");
  e = [];
  c = k(c, e);
  c = c.exec(d);
  if (!c) {
    e.length = 0;
  }
  g: {
    if (c) {
      a = c;
      break g;
    }
    a = m(d, a);
  }
  if (a) {
    a = l.parse("/profiles/:id.html");
    if (a == null) {
      b = new TypeError(__s0);
      throw b;
    }
    h: {
      a = a.protocol;
      if (a) {
        a = "/profiles/:id.html";
        break h;
      }
      a = g("/profiles/:id.html");
    }
    a = k.compile(a);
    d = {};
    f = 0;
    while (f < e.length) {
      h = e[f];
      if (h == null) {
        b = new TypeError(__s0);
        throw b;
      }
      h = h.name;
      d[h] = c[f + 1];
      f += 1;
    }
    a = a(d);
    if (a) {
      d = __o0();
      c = __o1();
      e = __o2();
      i = __o3();
      j = __o4();
      i = [d, c, e, i, j];
      i.splice(2, 1);
      j = g(a);
      a = {};
      b = __mk2(m, b, k, g);
      b = __mk1(k, g, b, l);
      l = __mk0(a, g, b);
      a.value = l;
      b = __rf0(a, g, b, j, i, true);
      return b;
    }
  }
  a = g("/download/:file");
  d = b.posix.resolve(n);
  c = a.replace("*", "(.*)");
  e = [];
  c = k(c, e);
  c = c.exec(d);
  if (!c) {
    e.length = 0;
  }
  i: {
    if (c) {
      a = c;
      break i;
    }
    a = m(d, a);
  }
  if (a) {
    a = l.parse("/assets/:file");
    if (a == null) {
      b = new TypeError(__s0);
      throw b;
    }
    j: {
      a = a.protocol;
      if (a) {
        a = "/assets/:file";
        break j;
      }
      a = g("/assets/:file");
    }
    a = k.compile(a);
    d = {};
    f = 0;
    while (f < e.length) {
      h = e[f];
      if (h == null) {
        b = new TypeError(__s0);
        throw b;
      }
      h = h.name;
      d[h] = c[f + 1];
      f += 1;
    }
    a = a(d);
    if (a) {
      d = __o0();
      c = __o1();
      e = __o2();
      i = __o3();
      j = __o4();
      i = [d, c, e, i, j];
      i.splice(3, 1);
      j = g(a);
      a = {};
      b = __mk2(m, b, k, g);
      b = __mk1(k, g, b, l);
      l = __mk0(a, g, b);
      a.value = l;
      b = __rf0(a, g, b, j, i, true);
      return b;
    }
  }
  a = g("/articles/:slug");
  d = b.posix.resolve(n);
  c = a.replace("*", "(.*)");
  e = [];
  c = k(c, e);
  c = c.exec(d);
  if (!c) {
    e.length = 0;
  }
  k: {
    if (c) {
      a = c;
      break k;
    }
    a = m(d, a);
  }
  if (a) {
    a = l.parse("/content/:slug.html");
    if (a == null) {
      b = new TypeError(__s0);
      throw b;
    }
    l: {
      a = a.protocol;
      if (a) {
        a = "/content/:slug.html";
        break l;
      }
      a = g("/content/:slug.html");
    }
    a = k.compile(a);
    d = {};
    f = 0;
    while (f < e.length) {
      h = e[f];
      if (h == null) {
        b = new TypeError(__s0);
        throw b;
      }
      h = h.name;
      d[h] = c[f + 1];
      f += 1;
    }
    a = a(d);
    if (a) {
      d = __o0();
      c = __o1();
      e = __o2();
      i = __o3();
      j = __o4();
      i = [d, c, e, i, j];
      i.splice(4, 1);
      j = g(a);
      a = {};
      b = __mk2(m, b, k, g);
      b = __mk1(k, g, b, l);
      l = __mk0(a, g, b);
      a.value = l;
      b = __rf0(a, g, b, j, i, true);
      return b;
    }
  }
  return null;
}
