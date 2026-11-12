// `o[k] = v` as strict code does it (inlined into a sloppy residual
// function): a write that fails throws.
function __pe_strictSet(o, k, v) {
  "use strict";
  o[k] = v;
}


// `--` of a value that may be a BigInt.
function __pe_dec(v) {
  return --v;
}


function __mk0(e, f) {
  "use strict";
  return function u(j, i) {
    let g, a, b, c, d, h;
    a: {
      g = i[0];
      a = i[1];
      b = i[2];
      if (g.some(__mk1(f))) {
        for (h in a) {
          if (e.o(a, h)) {
            e.m[h] = a[h];
          }
        }
        if (b) {
          a = b(e);
          break a;
        }
        a = void 0;
        break a;
      }
      a = void 0;
    }
    if (j) {
      j(i);
    }
    b = 0;
    while (b < g.length) {
      c = g[b];
      if (e.o(f.value, c) && f.value[c]) {
        (f.value[c][0])();
      }
      f.value[c] = 0;
      b += 1;
    }
    return e.O(a);
  };
}

function __mk1(a) {
  "use strict";
  return function(b) {
    return 0 !== a.value[b];
  };
}

function __mk2(a, k, l) {
  "use strict";
  return function f(b) {
    let g, h, m, n, o, i, c, j, d, e;
    h = a.value[b];
    if (void 0 !== h) {
      return h.exports;
    }
    g = {exports: {}};
    a.value[b] = g;
    m = a;
    n = k;
    o = l;
    i = b;
    c = g;
    j = true;
    d = 0;
    e = void 0;
    try {
      (n.value[i])(c, c.exports, o.value);
      j = false;
    } catch (p) {
      d = 2;
      e = p;
    }
    if (j) {
      (delete m.value[i]);
    }
    if (d === 1) {
      return e;
    }
    if (d === 2) {
      throw e;
    }
    return c.exports;
  };
}

function __mk3(b, l) {
  "use strict";
  return function(p, j, q, m) {
    let f, d, h, a, g, e, i, c, n, k, o;
    if (j) {
      a = b.value.length;
      while (a > 0 && b.value[a - 1][2] > (m || 0)) {
        b.value[a] = b.value[a - 1];
        --a;
      }
      f = [j, q, m || 0];
      b.value[a] = f;
      return;
    }
    f = {value: j};
    d = {value: void 0};
    h = p;
    a = 0;
    g = Infinity;
    while (a < b.value.length) {
      f.value = b.value[a][0];
      o = b.value[a][1];
      i = b.value[a][2];
      d.value = 0;
      e = true;
      while (d.value < f.value.length) {
        c = g >= i;
        if (c) {
          c = Object.keys(l.value.O);
          c = c.every(__mk4(d, l, f));
        }
        a: {
          if (c) {
            c = f.value;
            n = c.splice;
            k = -(-d.value);
            d.value = __pe_dec(k);
            n.call(c, k, 1);
            break a;
          }
          e = i < g;
          g = e ? i : g;
          e = false;
        }
        ++d.value;
      }
      if (e) {
        b.value.splice.call(b.value, -(-a), 1);
        e = o();
        h = void 0 !== e ? e : h;
        --a;
      }
      ++a;
    }
    return h;
  };
}

function __mk4(a, b, c) {
  "use strict";
  return function(d) {
    return (b.value.O[d])(c.value[a.value]);
  };
}

function __mk5(a) {
  "use strict";
  return function(b) {
    return 0 === a.value[b];
  };
}

function __mk6(c) {
  "use strict";
  return function(b) {
    let a;
    a: {
      if (b && b.__esModule) {
        a = __mk7(b);
        break a;
      }
      a = __mk8(b);
    }
    c.value.d.call(c.value, a, {a: a});
    return a;
  };
}

function __mk7(a) {
  "use strict";
  return function() {
    return a.default;
  };
}

function __mk8(a) {
  "use strict";
  return function() {
    return a;
  };
}

function __mk9(f) {
  "use strict";
  return function(g, d) {
    let e, a, b, c;
    for (b in d) {
      c = f.value.o(d, b);
      if (c) {
        c = !f.value.o(g, b);
      }
      if (c) {
        c = {enumerable: true, get: d[b]};
        Object.defineProperty(g, b, c);
      }
    }
    return;
  };
}

function __mk10(b) {
  "use strict";
  return function(c) {
    let a;
    a = Object.keys(b.value.f);
    a = a.reduce(__mk11(c, b), []);
    return Promise.all(a);
  };
}

function __mk11(b, c) {
  "use strict";
  return function(a, d) {
    (c.value.f[d])(b, a);
    return a;
  };
}

function __mk15(i, k, g) {
  "use strict";
  return function(f, l, j, m) {
    let a, b, d, c, e, h;
    if (g.value[f]) {
      (g.value[f]).push(l);
      return;
    }
    a: {
      a = {value: void 0};
      if (void 0 !== j) {
        b = document.getElementsByTagName("script");
        d = 0;
        while (d < b.length) {
          b: {
            c = b[d];
            e = c.getAttribute("src") == f;
            if (e) {
              break b;
            }
            e = c.getAttribute("data-webpack") == k.value + j;
          }
          if (e) {
            a.value = c;
            break a;
          }
          d += 1;
        }
      }
    }
    c: {
      if (a.value) {
        b = void 0;
        break c;
      }
      b = document.createElement("script");
      a.value = b;
      b.charset = "utf-8";
      a.value.timeout = 120;
      if (i.value.nc) {
        a.value.setAttribute("nonce", i.value.nc);
      }
      a.value.setAttribute("data-webpack", k.value + j);
      a.value.src = i.value.tu(f);
      b = true;
    }
    g.value[f] = [l];
    d = setTimeout;
    c = a.value;
    g.value;
    e = {value: void 0};
    h = __mk16(f, a, e, g);
    c = Function.prototype.bind.call(h, null, void 0, {type: "timeout", target: c});
    Object.defineProperties(c, {name: {value: "bound d", configurable: true}, length: {value: 0, configurable: true}});
    e.value = d(c, 120000);
    a.value.onerror = h.bind(null, a.value.onerror);
    a.value.onload = h.bind(null, a.value.onload);
    if (b) {
      document.head.appendChild(a.value);
    }
    return;
  };
}

function __mk16(c, a, h, e) {
  "use strict";
  return function d(f, g) {
    let b;
    a.value.onload = null;
    a.value.onerror = null;
    a.value;
    clearTimeout(h.value);
    b = e.value[c];
    delete e.value[c];
    if (a.value.parentNode) {
      a.value.parentNode.removeChild(a.value);
    }
    if (b) {
      b.forEach(__mk17(g));
    }
    if (f) {
      return f(g);
    }
    return;
  };
}

function __mk17(a) {
  "use strict";
  return function(b) {
    return b(a);
  };
}

function __mk19(a) {
  "use strict";
  return function() {
    if (void 0 === a.value) {
      a.value = {createScriptURL: (function createScriptURL(a) {
  "use strict";
  return a;
})};
      if ("undefined" != typeof trustedTypes && trustedTypes.createPolicy) {
        a.value = trustedTypes.createPolicy("nextjs#bundler", a.value);
      }
    }
    return a.value;
  };
}

function __mk21(a) {
  "use strict";
  return function(b) {
    return a.value.tt().createScriptURL(b);
  };
}

function __mk22(c, e) {
  "use strict";
  return function(a, g) {
    let b, d, f;
    a: {
      b = c.value.o(e.value, a) ? e.value[a] : void 0;
      d = g;
      if (0 !== b) {
        if (b) {
          d.push(b[2]);
          break a;
        }
        if (2272 != a) {
          b = {value: b};
          f = new Promise(__mk23(a, b, e));
          d.push;
          b.value[2] = f;
          d.push(f);
          d = c.value.p + c.value.u(a);
          f = Error();
          c.value.l.call(c.value, d, __mk24(a, c, f, b, e), "chunk-" + a, a);
          break a;
        }
        e.value[a] = 0;
      }
    }
  };
}

function __mk23(c, d, b) {
  "use strict";
  return function(e, f) {
    let a;
    a = [e, f];
    b.value[c] = a;
    b.value;
    d.value = a;
  };
}

function __mk24(d, h, c, e, f) {
  "use strict";
  return function(b) {
    let a, g;
    a = h.value.o(f.value, d);
    if (a) {
      a = f.value[d];
      e.value = a;
      if (0 !== a) {
        f.value[d] = void 0;
      }
      a = e.value;
    }
    if (a) {
      a = b && ("load" === b.type ? "missing" : b.type);
      g = b && b.target && b.target.src;
      c.message = "Loading chunk " + d + " failed.\n(" + a + ": " + g + ")";
      c.name = "ChunkLoadError";
      c.type = a;
      c.request = g;
      (e.value[1])(c);
    }
  };
}

{
  let d, b, f, a, c, h, e, k, l, m, i, n, o, p, q, r, s, t, u, g, j;
  d = self;
  b = self.webpackChunk_N_E;
  b = b ? b : [];
  __pe_strictSet(d, "webpackChunk_N_E", b);
  d = b.forEach;
  f = {};
  a = {value: f};
  c = {};
  a = __mk2({value: {}}, a, c);
  h = __mk3({value: []}, c);
  e = {value: {2272: 0}};
  k = __mk5(e);
  l = __mk6(c);
  m = __mk9(c);
  i = {};
  n = __mk10(c);
  o = (0, function(a) {
  "use strict";
  return "static/chunks/" + a + "." + {4296: "c2dfe952763896a1", 6179: "81089300d9f8b98f", 6740: "2ee5e4948a1e9398", 6834: "42d9db740d41733f", 6943: "7f29ceed79ac0364"}[a] + ".js";
});
  p = (0, function(a) {
  "use strict";
  return "static/css/" + {2888: "bee275c02cdcc5e8", 7203: "34ec155464ec7a17"}[a] + ".css";
});
  q = (0, function(a, b) {
  "use strict";
  return Object.prototype.hasOwnProperty.call(a, b);
});
  r = __mk15(c, {value: "_N_E:"}, {value: {}});
  s = (0, function(a) {
  "use strict";
  a: {
    if (Symbol.toStringTag) {
      Object.defineProperty(a, Symbol.toStringTag, {value: "Module"});
      break a;
    }
    Symbol.toStringTag;
  }
  Object.defineProperty(a, "__esModule", {value: true});
});
  t = __mk19({value: void 0});
  u = __mk21(c);
  g = __mk0(a, e);
  j = Function.prototype.bind.call(g, null, 0);
  Object.defineProperties(j, {name: {value: "bound u", configurable: true}, length: {value: 1, configurable: true}});
  e = __mk22(c, e);
  h.j = k;
  a.m = f;
  a.O = h;
  a.n = l;
  a.d = m;
  a.f = i;
  a.e = n;
  a.u = o;
  a.miniCssF = p;
  a.g = globalThis;
  a.o = q;
  a.l = r;
  a.r = s;
  a.tt = t;
  a.tu = u;
  a.p = "/_next/";
  c.value = a;
  i.j = e;
  d.call(b, j);
  d = g.bind;
  f = b.push.bind(b);
  d = d.call(g, null, f);
  __pe_strictSet(b, "push", d);
}
function main(a) {
  return a;
}
