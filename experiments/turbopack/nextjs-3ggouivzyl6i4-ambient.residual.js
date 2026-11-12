// A fresh strict arguments object of the arguments given.
function __pe_strictArgs() {
  "use strict";
  return arguments;
}


// `++` of a value that may be a BigInt.
function __pe_inc(v) {
  return ++v;
}


var __s0 = "Cannot destructure a null or undefined value";
var __s1 = "19aae25b-2456-8b30-b78f-0ccdd9a10579";
var __s2 = "dismissableLayer.pointerDownOutside";

function __o0() {
  return {value: void 0};
}
function __o1() {
  return {select: true};
}

function __mk2(a) {
  "use strict";
  return (b) => {
    return a.searchParams.append("args[]", b);
  };
}

function __mk3(c, b) {
  "use strict";
  return function o(d, e) {
    let a;
    a = c.value.useRef(b.value);
    if (a.current === b.value) {
      a.current = d(e);
    }
    return a;
  };
}

function __mk4(f, g, h) {
  "use strict";
  return function i(b, c, d, e) {
    let a;
    a = (0 , g.value)(f.value).current;
    if (a.refs[0] !== b || a.refs[1] !== c || a.refs[2] !== d || a.refs[3] !== e) {
      (0 , h.value)(a, [b, c, d, e]);
    }
    return a.callback;
  };
}

function __mk9(d) {
  "use strict";
  return () => {
    let a, b, c;
    a = 0;
    while (a < t.length) {
      a: {
        b = t[a];
        if (null != b) {
          c = typeof b;
          if (typeof b === "function") {
            c = d[a];
            if ("function" == typeof c) {
              c();
              break a;
            }
            b(null);
            break a;
          }
          if (c === "object") {
            b.current = null;
          }
        }
      }
      a += 1;
    }
    return;
  };
}

function __mk10(d, e, f) {
  "use strict";
  return function u(c) {
    let b, a;
    a: {
      b = (0 , e.value)(d.value).current;
      a = b.refs.length !== c.length;
      if (a) {
        break a;
      }
      a = b.refs;
      a = a.some(__mk11({value: c}));
    }
    if (a) {
      (0 , f.value)(b, c);
    }
    return b.callback;
  };
}

function __mk11(a) {
  "use strict";
  return (b, c) => {
    return b !== a.value[c];
  };
}

function __mk12(a) {
  "use strict";
  return function c(b) {
    return a.value >= b;
  };
}

function __mk15(b, h) {
  "use strict";
  const __f = function (g, c, d, e, f) {
    let a;
    if (!d && !e && !f && !g) {
      return (0 , h.value)(c);
    }
    a = (0 , h.value)(g);
    if (c) {
      a = (0 , b.value)(a, c);
    }
    if (d) {
      a = (0 , b.value)(a, d);
    }
    if (e) {
      a = (0 , b.value)(a, e);
    }
    if (f) {
      a = (0 , b.value)(a, f);
    }
    return a;
  };
  Object.defineProperty(__f, "name", { value: "v" });
  return __f;
}

function __mk16(i, j, k, l, m, n, o, p) {
  "use strict";
  return function E(h, f) {
    let d, e, c, b, a, g;
    a: {
      if ((0 , o.value)(f)) {
        d = (0 , p.value)(f, h);
        break a;
      }
      if (!f) {
        d = h;
        break a;
      }
      c = h;
      for (b in f) {
        b: {
          a = f[b];
          if (b === "style") {
            c[b] = (0 , n.value)(c.style, a);
            break b;
          }
          if (b === "className") {
            c[b] = (0 , k.value)(c.className, a);
            break b;
          }
          if ((0 , m.value)(b, a)) {
            c: {
              g = c[b];
              if (a) {
                d: {
                  if (g) {
                    a = __mk17(j, l, g, a);
                    break d;
                  }
                  a = (0 , i.value)(a);
                }
                break c;
              }
              a = g;
            }
            c[b] = a;
            break b;
          }
          c[b] = a;
        }
      }
      d = c;
    }
    return d;
  };
}

function __mk17(i, j, f, g) {
  "use strict";
  return function() {
    let b, c, a, e, d, h;
    const k = arguments;
    b = k.length;
    c = Array(b);
    a = 0;
    while (a < b) {
      c[a] = k[a];
      a += 1;
    }
    b = c[0];
    if ((0 , j.value)(b)) {
      (0 , i.value)(b);
      e = g.apply;
      a = [];
      d = (c[Symbol.iterator])();
      while (true) {
        h = d.next();
        if (h.done) {
          a: {
            a = e.call(g, void 0, a);
            if (b.baseUIHandlerPrevented) {
              break a;
            }
            if (f == null) {
              break a;
            }
            b = [];
            e = f.apply;
            c = (c[Symbol.iterator])();
            while (true) {
              d = c.next();
              if (d.done) {
                e.call(f, void 0, b);
                break a;
              }
              b.push(d.value);
            }
          }
          return a;
        }
        a.push(h.value);
      }
    }
    b = g.apply;
    a = [];
    e = (c[Symbol.iterator])();
    while (true) {
      d = e.next();
      if (d.done) {
        b: {
          a = b.call(g, void 0, a);
          if (f == null) {
            break b;
          }
          b = [];
          e = f.apply;
          c = (c[Symbol.iterator])();
          while (true) {
            d = c.next();
            if (d.done) {
              e.call(f, void 0, b);
              break b;
            }
            b.push(d.value);
          }
        }
        return a;
      }
      a.push(d.value);
    }
  };
}

function __mk18(c, d) {
  "use strict";
  return function C(a) {
    let b;
    a: {
      if (a) {
        b = __mk19(c, d, a);
        break a;
      }
      b = a;
    }
    return b;
  };
}

function __mk19(f, g, e) {
  "use strict";
  return function() {
    let b, c, a, d;
    const h = arguments;
    b = h.length;
    c = Array(b);
    a = 0;
    while (a < b) {
      c[a] = h[a];
      a += 1;
    }
    b = c[0];
    if ((0 , g.value)(b)) {
      (0 , f.value)(b);
    }
    b = e.apply;
    a = [];
    c = (c[Symbol.iterator])();
    while (true) {
      d = c.next();
      if (d.done) {
        return b.call(e, void 0, a);
      }
      a.push(d.value);
    }
  };
}

function __mk21(a) {
  "use strict";
  return () => {
    a.baseUIHandlerPrevented = true;
  };
}

function __mk26(c, d) {
  "use strict";
  return function w(a, e) {
    let b;
    a: {
      if ((0 , c.value)(a)) {
        b = a(e);
        break a;
      }
      b = a ?? d.value;
    }
    return b;
  };
}

function __mk27(g, i, j, k, l) {
  "use strict";
  return function h(e) {
    let a, c, b, d, f;
    a: {
      if ((0 , j.value)(e)) {
        a = (0 , l.value)(e, k.value);
        c = {};
        Object.assign(c, a);
        a = c;
        break a;
      }
      a = {};
      Object.assign(a, e);
      for (d in a) {
        f = a[d];
        if ((0 , i.value)(d, f)) {
          a[d] = (0 , g.value)(f);
        }
      }
    }
    return a;
  };
}

function __mk28(e, d, f) {
  "use strict";
  return function y(a) {
    let c, b;
    if (0 === a.length) {
      return f.value;
    }
    if (1 === a.length) {
      return (0 , d.value)(a[0]);
    }
    c = (0 , d.value)(a[0]);
    b = 1;
    while (b < a.length) {
      c = (0 , e.value)(c, a[b]);
      b += 1;
    }
    return c;
  };
}

function __mk29(p, q, l, s, m, i, t, u, n, w) {
  "use strict";
  return function(r, k) {
    let d, o, a, e, f, g, b, h, c, j;
    const v = arguments;
    a: {
      if (v.length > 2 && void 0 !== v[2]) {
        d = v[2];
        break a;
      }
      d = {};
    }
    o = k.render;
    a = void 0 !== d ? d : {};
    if (k == null) {
      throw new TypeError(__s0);
    }
    e = k.className;
    f = k.style;
    g = k.render;
    if (a == null) {
      throw new TypeError(__s0);
    }
    b: {
      b = a.state;
      b = b === void 0 ? i : b;
      h = a.ref;
      c = a.props;
      j = a.stateAttributesMapping;
      a = a.enabled;
      a = a === void 0 ? true : a;
      if (a) {
        if ("function" == typeof e) {
          e = e(b);
        }
        break b;
      }
      e = void 0;
    }
    c: {
      if (a) {
        if ("function" == typeof f) {
          f = f(b);
        }
        break c;
      }
      f = void 0;
    }
    d: {
      if (a) {
        b = __rf30(b, j);
        break d;
      }
      b = i;
    }
    e: {
      if (a && c) {
        f: {
          if (Array.isArray(c)) {
            c = w(c);
            break f;
          }
          c = n(void 0, c);
        }
        break e;
      }
      c = void 0;
    }
    g: {
      if (a) {
        b = (0 , l.value)(b, c);
        b = b == null ? {} : b;
        break g;
      }
      b = i;
    }
    h: {
      i: {
        j: {
          if ("u" > typeof document) {
            if (a) {
              if (Array.isArray(h)) {
                c = [];
                c.push(b.ref);
                j = u.value;
                a = (0 , s.value)(g);
                c.push(a);
                g = (h[Symbol.iterator])();
                a = b;
                h = c;
                while (true) {
                  c = g.next();
                  if (c.done) {
                    b.ref = j.call(u, h);
                    if (void 0 !== e) {
                      a.className = (0 , q.value)(a.className, e);
                    }
                    if (void 0 !== f) {
                      a.style = (0 , l.value)(a.style, f);
                    }
                    if (false === d.enabled) {
                      break i;
                    }
                    d = __rf31(p, t, n, r, o, a, d.state ?? i);
                    break h;
                  }
                  h.push(c.value);
                }
              }
              c = m.value;
              j = b.ref;
              g = (0 , s.value)(g);
              b.ref = c.call(m, j, g, h);
              break j;
            }
            (0 , m.value)(null, null);
          }
        }
        k: {
          if (a) {
            if (void 0 !== e) {
              b.className = (0 , q.value)(b.className, e);
            }
            if (void 0 !== f) {
              b.style = (0 , l.value)(b.style, f);
            }
            a = b;
            break k;
          }
          a = i;
        }
        if (false === d.enabled) {
          break i;
        }
        d = __rf31(p, t, n, r, o, a, d.state ?? i);
        break h;
      }
      d = null;
    }
    return d;
  };
}

function __rf30(e, f) {
  "use strict";
  let g, b, c, a, d, h;
  c = {};
  for (a in e) {
    a: {
      d = e[a];
      if (f == null) {
        h = void 0;
        break a;
      }
      h = f.hasOwnProperty(a);
    }
    if (h) {
      a = (f[a])(d);
      if (null != a) {
        Object.assign(c, a);
      }
      continue;
    }
    b: {
      if (true === d) {
        c["data-" + `${a.toLowerCase()}`] = "";
        break b;
      }
      if (d) {
        c["data-" + `${a.toLowerCase()}`] = d.toString();
      }
    }
  }
  return c;
}

function __rf31(h, f, i, e, c, b, j) {
  "use strict";
  let a, d, g;
  if (c) {
    if ("function" == typeof c) {
      return c(b, j);
    }
    a: {
      a = i(b, c.props);
      a.ref = b.ref;
      if (c.$$typeof === h) {
        d = f.value.Children.toArray(c)[0];
        break a;
      }
      d = c;
    }
    return f.value.cloneElement(d, a);
  }
  if (e && "string" == typeof e) {
    b: {
      if ("button" === e) {
        a = {type: "button"};
        Object.assign(a, b);
        d = f.value.createElement;
        g = {value: b.key, writable: true, enumerable: true, configurable: true};
        Object.defineProperty(a, "key", g);
        a = d("button", a);
        break b;
      }
      c: {
        if ("img" === e) {
          a = {alt: ""};
          Object.assign(a, b);
          d = f.value.createElement;
          g = {value: b.key, writable: true, enumerable: true, configurable: true};
          Object.defineProperty(a, "key", g);
          a = d("img", a);
          break c;
        }
        a = f.value.createElement(e, b);
      }
    }
    return a;
  }
  throw Error(t(8));
}

function __mk32(c, d) {
  "use strict";
  return function f(b) {
    let a;
    if (!d.value.isValidElement(b)) {
      return null;
    }
    a: {
      a = b.props;
      if ((0 , c.value)(19)) {
        a = a == null ? void 0 : a.ref;
        break a;
      }
      a = b.ref;
    }
    return a ?? null;
  };
}

function __mk35(c, e, d) {
  "use strict";
  return function(a) {
    let b;
    a: {
      if (c == null) {
        break a;
      }
      c(a);
    }
    if (false === e || !a.defaultPrevented) {
      b: {
        if (d == null) {
          b = void 0;
          break b;
        }
        b = d(a);
      }
      return b;
    }
    return;
  };
}

function __mk36(f, a) {
  "use strict";
  return function(d, e) {
    let b, c;
    b = a.createContext(e);
    c = __mk37(f, b, a);
    c.displayName = d + "Provider";
    return [c, __mk39(d, b, e, a)];
  };
}

function __mk37(j, k, h) {
  "use strict";
  return {i: (c) => {
    let f, d, g, a, b, e;
    if (c == null) {
      throw new TypeError(__s0);
    }
    f = c.children;
    d = Reflect.ownKeys(c);
    g = {};
    a = 0;
    while (a < d.length) {
      a: {
        b = d[a];
        if (b !== "children") {
          e = Object.prototype.propertyIsEnumerable.call(c, b);
          break a;
        }
        e = b !== "children";
      }
      if (e) {
        e = {value: c[b], writable: true, enumerable: true, configurable: true};
        Object.defineProperty(g, b, e);
      }
      a += 1;
    }
    d = h.useMemo;
    a = Object.values(g);
    f = {value: d.call(h, __mk38(g), a), children: f};
    return (0 , j.jsx)(k.Provider, f);
  }}.i;
}

function __mk38(a) {
  "use strict";
  return () => {
    return a;
  };
}

function __mk39(c, d, b, e) {
  "use strict";
  return function(f) {
    let a;
    a = e.useContext(d);
    if (a) {
      return a;
    }
    if (void 0 !== b) {
      return b;
    }
    throw Error("`" + `${f}` + "` must be used within `" + `${c}` + "`");
  };
}

function __mk40(j, d) {
  "use strict";
  return function(e) {
    let a, f, b, g, c, h;
    const i = arguments;
    a: {
      if (i.length > 1 && void 0 !== i[1]) {
        a = i[1];
        break a;
      }
      a = [];
    }
    f = {value: []};
    b = __mk41(e, f, d);
    b.scopeName = e;
    g = __mk45(d);
    c = [];
    c.push(b);
    b = g.apply;
    a = (a[Symbol.iterator])();
    while (true) {
      h = a.next();
      if (h.done) {
        return [__mk51(e, j, f, d), b.call(g, void 0, c)];
      }
      c.push(h.value);
    }
  };
}

function __mk41(c, a, b) {
  "use strict";
  return {i: () => {
    return __mk43(c, a.value.map.call(a.value, __mk42(b)), b);
  }}.i;
}

function __mk42(a) {
  "use strict";
  return (b) => {
    return a.createContext(b);
  };
}

function __mk43(c, e, d) {
  "use strict";
  return function(a) {
    let b;
    b = (a == null ? void 0 : a[c]) || e;
    return d.useMemo(__mk44(c, b, a), [a, b]);
  };
}

function __mk44(b, e, f) {
  "use strict";
  return () => {
    let c, d, a;
    a: {
      c = "__scope" + `${b}`;
      c = String(c);
      d = {};
      Object.assign(d, f);
      if (typeof b === "symbol") {
        a = b;
        break a;
      }
      a = String(b);
    }
    Object.defineProperty(d, a, {value: e, writable: true, enumerable: true, configurable: true});
    a = {};
    Object.defineProperty(a, c, {value: d, writable: true, enumerable: true, configurable: true});
    return a;
  };
}

function __mk45(d) {
  "use strict";
  return function() {
    let b, a, c;
    const e = arguments;
    b = e.length;
    a = {value: Array(b)};
    c = 0;
    while (c < b) {
      a.value[c] = e[c];
      c += 1;
    }
    b = a.value[0];
    if (1 === a.value.length) {
      return b;
    }
    a = __mk46(a, b, d);
    a.scopeName = b.scopeName;
    return a;
  };
}

function __mk46(a, b, c) {
  "use strict";
  return {i: () => {
    return __mk48(a.value.map.call(a.value, ({""(a) {
  "use strict";
  return {useScope: a(), scopeName: a.scopeName};
}}[""])), b, c);
  }}.i;
}

function __mk48(b, d, c) {
  "use strict";
  return function(e) {
    let a;
    a = b.reduce(__mk49(e), {});
    return c.useMemo(__mk50(d, a), [a]);
  };
}

function __mk49(d) {
  "use strict";
  return (e, c) => {
    let b, a;
    if (c == null) {
      throw new TypeError(__s0);
    }
    b = c.useScope;
    a = c.scopeName;
    b = b(d)["__scope" + `${a}`];
    a = {};
    Object.assign(a, e);
    Object.assign(a, b);
    return a;
  };
}

function __mk50(c, d) {
  "use strict";
  return () => {
    let a, b;
    a = "__scope" + `${c.scopeName}`;
    a = String(a);
    b = {};
    Object.defineProperty(b, a, {value: d, writable: true, enumerable: true, configurable: true});
    return b;
  };
}

function __mk51(h, k, b, c) {
  "use strict";
  return function(i, d) {
    let e, f, a, j, g;
    e = c.createContext(d);
    f = b.value.length;
    a = [];
    j = (b.value[Symbol.iterator])();
    while (true) {
      g = j.next();
      if (g.done) {
        a.push(d);
        b.value = a;
        a = __mk52(h, f, k, c, e);
        a.displayName = i + "Provider";
        return [a, __mk54(h, d, f, i, c, e)];
      }
      a.push(g.value);
    }
  };
}

function __mk52(j, k, l, i, m) {
  "use strict";
  return {s: (d) => {
    let a, g, f, h, c, b, e;
    if (d == null) {
      throw new TypeError(__s0);
    }
    a = d.scope;
    g = d.children;
    f = Reflect.ownKeys(d);
    h = {};
    c = 0;
    while (c < f.length) {
      a: {
        b = f[c];
        if (b !== "children") {
          b: {
            if (b !== "scope") {
              e = Object.prototype.propertyIsEnumerable.call(d, b);
              break b;
            }
            e = b !== "scope";
          }
          break a;
        }
        e = b !== "children";
      }
      if (e) {
        e = {value: d[b], writable: true, enumerable: true, configurable: true};
        Object.defineProperty(h, b, e);
      }
      c += 1;
    }
    c: {
      if (a == null) {
        a = void 0;
        break c;
      }
      a = a[j];
      a = a == null ? void 0 : a[k];
    }
    f = i.useMemo;
    c = Object.values(h);
    g = {value: f.call(i, __mk53(h), c), children: g};
    return (0 , l.jsx)((a || m).Provider, g);
  }}.s;
}

function __mk53(a) {
  "use strict";
  return () => {
    return a;
  };
}

function __mk54(d, c, f, g, h, i) {
  "use strict";
  return function(e, b) {
    let a;
    a: {
      if (b == null) {
        a = void 0;
        break a;
      }
      a = b[d];
      a = a == null ? void 0 : a[f];
    }
    a = h.useContext(a || i);
    if (a) {
      return a;
    }
    if (void 0 !== c) {
      return c;
    }
    throw Error("`" + `${e}` + "` must be used within `" + `${g}` + "`");
  };
}

function __mk56(d) {
  "use strict";
  return function r() {
    let b, c, a;
    const e = arguments;
    b = e.length;
    c = {value: Array(b)};
    a = 0;
    while (a < b) {
      c.value[a] = e[a];
      a += 1;
    }
    return __mk57(d, c);
  };
}

function __mk57(d, b) {
  "use strict";
  return (e) => {
    let a, c;
    a = {value: e};
    c = {value: false};
    a = b.value.map.call(b.value, __mk58(a, d, c));
    if (c.value) {
      return __mk59(d, a, b);
    }
    return;
  };
}

function __mk58(c, d, b) {
  "use strict";
  return (e) => {
    let a;
    a: {
      a = (0 , d.value)(e, c.value);
      if (b.value || "function" != typeof a) {
        break a;
      }
      b.value = true;
    }
    return a;
  };
}

function __mk59(d, c, e) {
  "use strict";
  return () => {
    let a, b;
    a = 0;
    while (a < c.length) {
      a: {
        b = c[a];
        if ("function" == typeof b) {
          b();
          break a;
        }
        (0 , d.value)(e.value[a], null);
      }
      a += 1;
    }
    return;
  };
}

function __mk61(f, g) {
  "use strict";
  return function() {
    let b, c, a, d, h, i, e;
    const j = arguments;
    b = j.length;
    c = Array(b);
    a = 0;
    while (a < b) {
      c[a] = j[a];
      a += 1;
    }
    b = g.useCallback;
    a = f.value.apply;
    d = [];
    h = f.value;
    i = (c[Symbol.iterator])();
    while (true) {
      e = i.next();
      if (e.done) {
        a = a.call(h, void 0, d);
        return b.call(g, a, c);
      }
      d.push(e.value);
    }
  };
}

function __mk63(d) {
  "use strict";
  return function r() {
    let b, c, a;
    const e = arguments;
    b = e.length;
    c = {value: Array(b)};
    a = 0;
    while (a < b) {
      c.value[a] = e[a];
      a += 1;
    }
    return __mk64(d, c);
  };
}

function __mk64(d, b) {
  "use strict";
  return (e) => {
    let a, c;
    a = {value: e};
    c = {value: false};
    a = b.value.map.call(b.value, __mk65(a, d, c));
    if (c.value) {
      return __mk66(d, a, b);
    }
    return;
  };
}

function __mk65(c, d, b) {
  "use strict";
  return (e) => {
    let a;
    a: {
      a = (0 , d.value)(e, c.value);
      if (b.value || "function" != typeof a) {
        break a;
      }
      b.value = true;
    }
    return a;
  };
}

function __mk66(d, c, e) {
  "use strict";
  return () => {
    let a, b;
    a = 0;
    while (a < c.length) {
      a: {
        b = c[a];
        if ("function" == typeof b) {
          b();
          break a;
        }
        (0 , d.value)(e.value[a], null);
      }
      a += 1;
    }
    return;
  };
}

function __mk68(f, g) {
  "use strict";
  return function() {
    let b, c, a, d, h, i, e;
    const j = arguments;
    b = j.length;
    c = Array(b);
    a = 0;
    while (a < b) {
      c[a] = j[a];
      a += 1;
    }
    b = g.useCallback;
    a = f.value.apply;
    d = [];
    h = f.value;
    i = (c[Symbol.iterator])();
    while (true) {
      e = i.next();
      if (e.done) {
        a = a.call(h, void 0, d);
        return b.call(g, a, c);
      }
      d.push(e.value);
    }
  };
}

function __mk70(x, u, v, y, w, i, z, r, A, B, s) {
  "use strict";
  return (e, C) => {
    let f, j, m, k, p, n, g, t, c, a, b, h, d, q, l, o;
    if (e == null) {
      throw new TypeError(__s0);
    }
    f = e.disableOutsidePointerEvents;
    f = f === void 0 ? false : f;
    j = e.onEscapeKeyDown;
    m = e.onPointerDownOutside;
    k = e.onFocusOutside;
    p = e.onInteractOutside;
    n = e.onDismiss;
    g = Reflect.ownKeys(e);
    t = {};
    c = 0;
    while (c < g.length) {
      a: {
        a = g[c];
        if (a !== "onDismiss") {
          b: {
            if (a !== "onInteractOutside") {
              c: {
                if (a !== "onFocusOutside") {
                  d: {
                    if (a !== "onPointerDownOutside") {
                      e: {
                        if (a !== "onEscapeKeyDown") {
                          f: {
                            if (a !== "disableOutsidePointerEvents") {
                              b = Object.prototype.propertyIsEnumerable.call(e, a);
                              break f;
                            }
                            b = a !== "disableOutsidePointerEvents";
                          }
                          break e;
                        }
                        b = a !== "onEscapeKeyDown";
                      }
                      break d;
                    }
                    b = a !== "onPointerDownOutside";
                  }
                  break c;
                }
                b = a !== "onFocusOutside";
              }
              break b;
            }
            b = a !== "onInteractOutside";
          }
          break a;
        }
        b = a !== "onDismiss";
      }
      if (b) {
        b = {value: e[a], writable: true, enumerable: true, configurable: true};
        Object.defineProperty(t, a, b);
      }
      c += 1;
    }
    g: {
      g = i.useContext(x);
      c = (i.useState(null)[Symbol.iterator])();
      a = c.next();
      if (a.done) {
        b = true;
        a = void 0;
        break g;
      }
      a = a.value;
      b = false;
    }
    h: {
      if (!b) {
        h = c.next();
        if (h.done) {
          b = true;
          h = void 0;
          break h;
        }
        h = h.value;
        break h;
      }
      h = void 0;
    }
    if (!b) {
      c.return != null && c.return();
    }
    c = a == null ? void 0 : a.ownerDocument;
    if (c == null) {
      c = globalThis == null ? void 0 : globalThis.document;
    }
    i: {
      b = (i.useState({})[Symbol.iterator])();
      d = b.next().done;
      if (!(d ? true : false)) {
        d = b.next();
        if (d.done) {
          d = true;
          q = void 0;
          break i;
        }
        q = d.value;
        d = false;
        break i;
      }
      d = true;
      q = void 0;
    }
    if (!d) {
      b.return != null && b.return();
    }
    b = (0 , y.j)(C, __mk71(h));
    h = Array.from(g.layers);
    d = [];
    l = (g.layersWithOutsidePointerEventsDisabled[Symbol.iterator])();
    while (true) {
      o = l.next();
      if (o.done) {
        j: {
          d = (d.slice(-1)[Symbol.iterator])();
          l = d.next();
          if (l.done) {
            o = true;
            l = void 0;
            break j;
          }
          l = l.value;
          o = false;
        }
        if (!o) {
          d.return != null && d.return();
        }
        k: {
          d = h.indexOf(l);
          if (a) {
            h = h.indexOf(a);
            break k;
          }
          h = -1;
        }
        l = g.layersWithOutsidePointerEventsDisabled.size > 0;
        d = h >= d;
        m = __mk72(n, d, g, p, m);
        m = __rf99(u, i, s, __pe_strictArgs(m, c), m, c);
        k = __mk80(n, g, p, k);
        k = __rf100(u, i, s, __pe_strictArgs(k, c), k, c);
        j = __mk85(n, g, j, h);
        __rf101(i, s, __pe_strictArgs(j, c), j, c);
        i.useEffect(__mk89(c, v, g, f, B, a), [a, c, f, g]);
        i.useEffect(__mk91(v, g, a), [a, g]);
        i.useEffect(__mk93(q, A), []);
        f = {};
        Object.assign(f, t);
        Object.defineProperty(f, "ref", {value: b, writable: true, enumerable: true, configurable: true});
        j = {pointerEvents: l ? d ? "auto" : "none" : void 0};
        Object.assign(j, e.style);
        Object.defineProperty(f, "style", {value: j, writable: true, enumerable: true, configurable: true});
        j = w.jsx;
        p = z.value.V.div;
        n = {value: (0 , r.f)(e.onFocusCapture, k.onFocusCapture), writable: true, enumerable: true, configurable: true};
        Object.defineProperty(f, "onFocusCapture", n);
        k = {value: (0 , r.f)(e.onBlurCapture, k.onBlurCapture), writable: true, enumerable: true, configurable: true};
        Object.defineProperty(f, "onBlurCapture", k);
        m = {value: (0 , r.f)(e.onPointerDownCapture, m.onPointerDownCapture), writable: true, enumerable: true, configurable: true};
        Object.defineProperty(f, "onPointerDownCapture", m);
        return j.call(w, p, f);
      }
      d.push(o.value);
    }
  };
}

function __mk71(a) {
  "use strict";
  return (b) => {
    return a(b);
  };
}

function __mk72(e, i, j, f, g) {
  "use strict";
  return (a) => {
    let b, c, h, d;
    b = a.target;
    c = [];
    h = (j.branches[Symbol.iterator])();
    while (true) {
      d = h.next();
      if (d.done) {
        a: {
          b = c.some(__mk73(b));
          if (i && !b) {
            b: {
              if (g == null) {
                break b;
              }
              g(a);
            }
            c: {
              if (f == null) {
                break c;
              }
              f(a);
            }
            if (a.defaultPrevented) {
              break a;
            }
            if (e == null) {
              break a;
            }
            e();
          }
        }
        return;
      }
      c.push(d.value);
    }
  };
}

function __mk73(a) {
  "use strict";
  return (b) => {
    return b.contains(a);
  };
}

function __mk75(d, c, e, a) {
  "use strict";
  return () => {
    let b;
    b = __mk77(d, c, e, a);
    return __mk79(b, c, window.setTimeout(__mk76(b, a), 0), a);
  };
}

function __mk76(a, b) {
  "use strict";
  return () => {
    b.addEventListener("pointerdown", a);
  };
}

function __mk77(d, a, f, b) {
  "use strict";
  return {e: (c) => {
    a: {
      if (c.target && !o.current) {
        if ("touch" === c.pointerType) {
          b.removeEventListener("click", a.current);
          a.current = __mk78(d, {value: {originalEvent: c}}, f);
          b.addEventListener("click", a.current, {once: true});
          break a;
        }
        d(__s2, f, {originalEvent: c}, {discrete: true});
        break a;
      }
      b.removeEventListener("click", a.current);
    }
    o.current = false;
  }}.e;
}

function __mk78(a, b, c) {
  "use strict";
  return function n() {
    a(__s2, c, b.value, {discrete: true});
  };
}

function __mk79(b, c, d, a) {
  "use strict";
  return () => {
    window.clearTimeout(d);
    a.removeEventListener("pointerdown", b);
    a.removeEventListener("click", c.current);
  };
}

function __mk80(d, i, e, f) {
  "use strict";
  return (a) => {
    let g, b, h, c;
    g = a.target;
    b = [];
    h = (i.branches[Symbol.iterator])();
    while (true) {
      c = h.next();
      if (c.done) {
        a: {
          if (!b.some(__mk81(g))) {
            b: {
              if (f == null) {
                break b;
              }
              f(a);
            }
            c: {
              if (e == null) {
                break c;
              }
              e(a);
            }
            if (a.defaultPrevented) {
              break a;
            }
            if (d == null) {
              break a;
            }
            d();
          }
        }
        return;
      }
      b.push(c.value);
    }
  };
}

function __mk81(a) {
  "use strict";
  return (b) => {
    return b.contains(a);
  };
}

function __mk82(c, d, e, b) {
  "use strict";
  return () => {
    let a;
    a = __mk83(c, d, e);
    b.addEventListener("focusin", a);
    return __mk84(a, b);
  };
}

function __mk83(b, c, d) {
  "use strict";
  return {e: (a) => {
    if (a.target && !c.current) {
      b("dismissableLayer.focusOutside", d, {originalEvent: a}, {discrete: false});
    }
  }}.e;
}

function __mk84(a, b) {
  "use strict";
  return () => {
    return b.removeEventListener("focusin", a);
  };
}

function __mk85(b, d, c, e) {
  "use strict";
  return (a) => {
    if (e === d.layers.size - 1) {
      a: {
        if (c == null) {
          break a;
        }
        c(a);
      }
      if (!a.defaultPrevented && b) {
        a.preventDefault();
        b();
      }
    }
  };
}

function __mk86(c, a) {
  "use strict";
  return () => {
    let b;
    b = __mk87(c);
    a.addEventListener("keydown", b, {capture: true});
    return __mk88(b, a);
  };
}

function __mk87(b) {
  "use strict";
  return {e: (a) => {
    if ("Escape" === a.key) {
      b(a);
    }
  }}.e;
}

function __mk88(b, a) {
  "use strict";
  return () => {
    return a.removeEventListener("keydown", b, {capture: true});
  };
}

function __mk89(b, f, a, d, e, c) {
  "use strict";
  return () => {
    if (c) {
      if (d) {
        if (0 === a.layersWithOutsidePointerEventsDisabled.size) {
          e.value = b.body.style.pointerEvents;
          b.body.style.pointerEvents = "none";
        }
        a.layersWithOutsidePointerEventsDisabled.add(c);
      }
      a.layers.add(c);
      f();
      return __mk90(b, a, d, e);
    }
    return;
  };
}

function __mk90(b, c, d, a) {
  "use strict";
  return () => {
    if (d && 1 === c.layersWithOutsidePointerEventsDisabled.size) {
      b.body.style.pointerEvents = a.value;
      a.value;
    }
  };
}

function __mk91(a, b, c) {
  "use strict";
  return () => {
    return __mk92(a, b, c);
  };
}

function __mk92(c, b, a) {
  "use strict";
  return () => {
    if (a) {
      b.layers.delete(a);
      b.layersWithOutsidePointerEventsDisabled.delete(a);
      c();
    }
  };
}

function __mk93(c, b) {
  "use strict";
  return () => {
    let a;
    a = __mk94(c);
    document.addEventListener(b.value, a);
    return __mk95(a, b);
  };
}

function __mk94(a) {
  "use strict";
  return {e: () => {
    return a({});
  }}.e;
}

function __mk95(a, b) {
  "use strict";
  return () => {
    return document.removeEventListener(b.value, a);
  };
}

function __mk96(a) {
  "use strict";
  return {onFocusCapture: () => {
    a.current = true;
    return true;
  }}.onFocusCapture;
}

function __mk97(a) {
  "use strict";
  return {onBlurCapture: () => {
    a.current = false;
    return false;
  }}.onBlurCapture;
}

function __mk98(a) {
  "use strict";
  return {onPointerDownCapture: () => {
    a.current = true;
    return true;
  }}.onPointerDownCapture;
}

function __rf99(g, a, h, c, i) {
  "use strict";
  let b, d, e, f;
  a: {
    if (c.length > 1 && void 0 !== c[1]) {
      b = c[1];
      break a;
    }
    b = globalThis == null ? void 0 : globalThis.document;
  }
  d = (0 , h.f)(i);
  e = a.useRef(false);
  f = a.useRef(({""() {
  "use strict";
}}[""]));
  a.useEffect(__mk75(g, f, d, b), [b, d]);
  return {onPointerDownCapture: __mk98(e)};
}

function __rf100(g, c, h, d, f) {
  "use strict";
  let a, e, b;
  a: {
    if (d.length > 1 && void 0 !== d[1]) {
      a = d[1];
      break a;
    }
    a = globalThis == null ? void 0 : globalThis.document;
  }
  e = (0 , h.f)(f);
  b = c.useRef(false);
  c.useEffect(__mk82(g, b, e, a), [a, e]);
  return {onFocusCapture: __mk96(b), onBlurCapture: __mk97(b)};
}

function __rf101(d, e, b, f) {
  "use strict";
  let a, c;
  a: {
    if (b.length > 1 && void 0 !== b[1]) {
      a = b[1];
      break a;
    }
    a = globalThis == null ? void 0 : globalThis.document;
  }
  c = (0 , e.f)(f);
  d.useEffect(__mk86(c, a), [c, a]);
}

function __mk102(i) {
  "use strict";
  return function d(c, e, f, g) {
    let h, a, b;
    if (g == null) {
      throw new TypeError(__s0);
    }
    h = g.discrete;
    a = f.originalEvent.target;
    b = new CustomEvent(c, {bubbles: false, cancelable: true, detail: f});
    if (e) {
      a.addEventListener(c, e, {once: true});
    }
    a: {
      if (h) {
        (0 , i.value.u)(a, b);
        break a;
      }
      a.dispatchEvent(b);
    }
    return;
  };
}

function __mk103(b) {
  "use strict";
  return function f() {
    let a;
    a = new CustomEvent(b.value);
    document.dispatchEvent(a);
  };
}

function __mk104(g, j, k, b, l) {
  "use strict";
  return (h, i) => {
    let a, c, d, e, f;
    a = b.useContext(g);
    c = b.useRef(null);
    d = (0 , j.j)(i, c);
    e = b.useEffect;
    f = [a.branches];
    e.call(b, __mk105(a, c), f);
    a = {};
    Object.assign(a, h);
    Object.defineProperty(a, "ref", {value: d, writable: true, enumerable: true, configurable: true});
    return (0 , k.jsx)(l.value.V.div, a);
  };
}

function __mk105(b, c) {
  "use strict";
  return () => {
    let a;
    a = c.current;
    if (a) {
      b.branches.add(a);
      return __mk106(a, b);
    }
    return;
  };
}

function __mk106(a, b) {
  "use strict";
  return () => {
    b.branches.delete(a);
  };
}

function __mk108(b, c, a) {
  "use strict";
  return function() {
    a.useEffect(__mk109(b, c), []);
  };
}

function __mk109(e, f) {
  "use strict";
  return () => {
    let a, b, c, d;
    a = document.querySelectorAll("[data-radix-focus-guard]");
    b = document.body;
    c = b.insertAdjacentElement;
    d = a[0];
    if (d == null) {
      d = f();
    }
    c.call(b, "afterbegin", d);
    b = document.body;
    c = b.insertAdjacentElement;
    a = a[1];
    if (a == null) {
      a = f();
    }
    c.call(b, "beforeend", a);
    ++e.value;
    return __mk110(e);
  };
}

function __mk110(a) {
  "use strict";
  return () => {
    let b;
    if (1 === a.value) {
      b = document.querySelectorAll("[data-radix-focus-guard]");
      b.forEach(({""(a) {
  "use strict";
  return a.remove();
}}[""]));
    }
    --a.value;
  };
}

function __mk113() {
  "use strict";
  return (b) => {
    let a, d, f, c, g, i, j, k, l, e, h;
    a = b.i(993856);
    d = b.i(420341);
    f = b.i(902563);
    c = b.i(134715);
    g = b.i(814996);
    i = {bubbles: false, cancelable: true};
    j = (function d(f, e) {
  "use strict";
  let c, a, b;
  c = (f[Symbol.iterator])();
  a: while (true) {
    a = c.next();
    if (a.done) {
      return;
    }
    a = a.value;
    if ("hidden" === getComputedStyle(a).visibility) {
      continue;
    }
    b = a;
    while (b && (void 0 === e || b !== e)) {
      if ("none" === getComputedStyle(b).display) {
        continue a;
      }
      b = b.parentElement;
    }
    c.return != null && c.return();
    return a;
  }
});
    k = (function f(c) {
  "use strict";
  let a, b;
  a = [];
  b = document.createTreeWalker(c, NodeFilter.SHOW_ELEMENT, {acceptNode: ({acceptNode(a) {
  "use strict";
  let b;
  b = "INPUT" === a.tagName && "hidden" === a.type;
  return a.disabled || a.hidden || b ? NodeFilter.FILTER_SKIP : a.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
}}.acceptNode)});
  while (b.nextNode()) {
    a.push(b.currentNode);
  }
  return a;
});
    l = (function m(a) {
  "use strict";
  let b, c, d;
  a: {
    if (arguments.length > 1 && void 0 !== arguments[1]) {
      b = arguments[1];
      break a;
    }
    b = {};
  }
  if (b == null) {
    throw new TypeError("Cannot destructure a null or undefined value");
  }
  b = b.select;
  b = b === void 0 ? false : b;
  if (a && a.focus) {
    b: {
      c = document.activeElement;
      a.focus({preventScroll: true});
      if (a !== c) {
        c = a instanceof HTMLInputElement;
        d = a;
        break b;
      }
      d = void 0;
      c = a !== c;
    }
    if (c && "select" in d && b) {
      a.select();
    }
  }
  return;
});
    e = {value: a};
    h = __o0();
    a = a.forwardRef(__mk114(i, j, k, c, "focusScope.autoFocusOnMount", l, e, f, h, {value: d}, "focusScope.autoFocusOnUnmount", g));
    a.displayName = "FocusScope";
    d = {value: []};
    c = __mk133();
    h.value = {add: __mk132(d, c), remove: __mk134(d, c)};
    b.s(["f", 0, a], 81290);
    a = b.i(455056);
    d = b.i(374458);
    c = e.value;
    a = c.forwardRef(__mk135(d, e, f, g, a));
    a.displayName = "Portal";
    b.s(["f", 0, a], 390685);
  };
}

function __mk114(q, r, m, n, s, k, e, t, u, v, w, x) {
  "use strict";
  return (g, y) => {
    let h, d, i, j, f, l, c, b, a, o, p;
    if (g == null) {
      throw new TypeError(__s0);
    }
    h = g.loop;
    h = h === void 0 ? false : h;
    d = g.trapped;
    d = d === void 0 ? false : d;
    i = g.onMountAutoFocus;
    j = g.onUnmountAutoFocus;
    f = Reflect.ownKeys(g);
    l = {};
    c = 0;
    while (c < f.length) {
      a: {
        b = f[c];
        if (b !== "onUnmountAutoFocus") {
          b: {
            if (b !== "onMountAutoFocus") {
              c: {
                if (b !== "trapped") {
                  d: {
                    if (b !== "loop") {
                      a = Object.prototype.propertyIsEnumerable.call(g, b);
                      break d;
                    }
                    a = b !== "loop";
                  }
                  break c;
                }
                a = b !== "trapped";
              }
              break b;
            }
            a = b !== "onMountAutoFocus";
          }
          break a;
        }
        a = b !== "onUnmountAutoFocus";
      }
      if (a) {
        a = {value: g[b], writable: true, enumerable: true, configurable: true};
        Object.defineProperty(l, b, a);
      }
      c += 1;
    }
    e: {
      f = (e.value.useState(null)[Symbol.iterator])();
      c = f.next();
      if (c.done) {
        b = true;
        c = void 0;
        break e;
      }
      c = c.value;
      b = false;
    }
    f: {
      if (!b) {
        a = f.next();
        if (a.done) {
          b = true;
          a = void 0;
          break f;
        }
        a = a.value;
        break f;
      }
      a = void 0;
    }
    if (!b) {
      f.return != null && f.return();
    }
    i = (0 , n.f)(i);
    j = (0 , n.f)(j);
    f = e.value.useRef(null);
    b = (0 , v.value.j)(y, __mk115(a));
    a = e.value.useRef.call(e.value, {paused: false, pause: ({pause() {
  "use strict";
  this.paused = true;
}}.pause), resume: ({resume() {
  "use strict";
  this.paused = false;
}}.resume)}).current;
    o = e.value.useEffect;
    p = [d, c, a.paused];
    o.call(e.value, __mk118(f, a, c, k, d), p);
    e.value.useEffect.call(e.value, __mk123(j, a, q, c, m, s, k, u, w, i), [c, i, j, a]);
    i = e.value.useCallback;
    j = [h, d, a.paused];
    h = i.call(e.value, __mk127(a, h, r, m, k, d), j);
    d = {tabIndex: -1};
    Object.assign(d, l);
    Object.defineProperty(d, "ref", {value: b, writable: true, enumerable: true, configurable: true});
    Object.defineProperty(d, "onKeyDown", {value: h, writable: true, enumerable: true, configurable: true});
    return (0 , x.jsx)(t.V.div, d);
  };
}

function __mk115(b) {
  "use strict";
  return (a) => {
    return b(a);
  };
}

function __mk118(f, g, a, b, h) {
  "use strict";
  return () => {
    let c, d, e;
    if (h) {
      c = __mk119(f, g, a, b);
      document.addEventListener("focusin", c);
      d = __mk120(f, g, a, b);
      document.addEventListener("focusout", d);
      e = new MutationObserver(__mk121(a, b));
      if (a) {
        e.observe(a, {childList: true, subtree: true});
      }
      return __mk122(c, e, d);
    }
    return;
  };
}

function __mk119(b, d, c, f) {
  "use strict";
  return function e(g) {
    let a;
    if (d.paused || !c) {
      return;
    }
    a: {
      a = g.target;
      if (c.contains(a)) {
        b.current = a;
        break a;
      }
      f(b.current, __o1());
    }
    return;
  };
}

function __mk120(c, d, b, e) {
  "use strict";
  return function t(f) {
    let a;
    if (d.paused || !b) {
      return;
    }
    a: {
      a = f.relatedTarget;
      if (null !== a) {
        if (b.contains(a)) {
          break a;
        }
        e(c.current, __o1());
      }
    }
    return;
  };
}

function __mk121(c, d) {
  "use strict";
  return function(e) {
    let b, a;
    a: {
      if (document.activeElement === document.body) {
        b = (e[Symbol.iterator])();
        while (true) {
          a = b.next();
          if (a.done) {
            break a;
          }
          if (a.value.removedNodes.length > 0) {
            d(c);
          }
        }
      }
    }
  };
}

function __mk122(a, b, c) {
  "use strict";
  return () => {
    document.removeEventListener("focusin", a);
    document.removeEventListener("focusout", c);
    b.disconnect();
  };
}

function __mk123(l, g, h, b, m, d, e, i, n, j) {
  "use strict";
  return () => {
    let c, a, k, f;
    if (b) {
      a: {
        i.value.add(g);
        c = document.activeElement;
        if (!b.contains(c)) {
          a = new CustomEvent(d, h);
          b.addEventListener(d, j);
          b.dispatchEvent(a);
          if (a.defaultPrevented) {
            break a;
          }
          a = m(b);
          a = a.filter(({""(a) {
  "use strict";
  return "A" !== a.tagName;
}}[""]));
          k = document.activeElement;
          a = (a[Symbol.iterator])();
          while (true) {
            b: {
              f = a.next();
              if (f.done) {
                if (document.activeElement === c) {
                  break b;
                }
                break a;
              }
              e(f.value, __o1());
              if (document.activeElement !== k) {
                a.return != null && a.return();
                if (document.activeElement === c) {
                  break b;
                }
                break a;
              }
              continue;
            }
            e(b);
            break a;
          }
        }
      }
      return __mk124(l, g, h, b, c, d, e, i, n, j);
    }
    return;
  };
}

function __mk124(b, c, d, a, e, f, g, h, i, j) {
  "use strict";
  return () => {
    a.removeEventListener(f, j);
    setTimeout(__mk125(b, c, d, a, e, g, h, i), 0);
  };
}

function __mk125(d, e, f, a, g, h, i, b) {
  "use strict";
  return () => {
    let c;
    a: {
      c = new CustomEvent(b, f);
      a.addEventListener(b, d);
      a.dispatchEvent(c);
      if (c.defaultPrevented) {
        break a;
      }
      h(g ?? document.body, __o1());
    }
    a.removeEventListener(b, d);
    i.value.remove(e);
  };
}

function __mk127(k, h, i, l, j, m) {
  "use strict";
  return (a) => {
    let e, f, c, d, g, b;
    if (!h && !m || k.paused) {
      return;
    }
    a: {
      e = "Tab" === a.key && !a.altKey && !a.ctrlKey && !a.metaKey;
      f = document.activeElement;
      if (e && f) {
        b: {
          e = a.currentTarget;
          c = l(e);
          c = ([i(c, e), i(c.reverse(), e)][Symbol.iterator])();
          d = c.next();
          if (d.done) {
            g = true;
            d = void 0;
            break b;
          }
          d = d.value;
          g = false;
        }
        c: {
          if (!g) {
            b = c.next();
            if (b.done) {
              g = true;
              b = void 0;
              break c;
            }
            b = b.value;
            break c;
          }
          b = void 0;
        }
        if (!g) {
          c.return != null && c.return();
        }
        if (d && b) {
          if (a.shiftKey || f !== b) {
            if (a.shiftKey && f === d) {
              a.preventDefault();
              if (h) {
                j(b, __o1());
                break a;
              }
              break a;
            }
            break a;
          }
          a.preventDefault();
          if (h) {
            j(d, __o1());
            break a;
          }
          break a;
        }
        if (f === e) {
          a.preventDefault();
        }
      }
    }
    return;
  };
}

function __mk132(c, d) {
  "use strict";
  return {add(b) {
    let a;
    a: {
      a = c.value[0];
      if (b !== a) {
        if (a == null) {
          break a;
        }
        a.pause();
      }
    }
    a = d(c.value, b);
    c.value = a;
    a.unshift(b);
  }}.add;
}

function __mk133() {
  "use strict";
  const __f = function (d, e) {
    let a, b, c;
    a = [];
    b = (d[Symbol.iterator])();
    while (true) {
      c = b.next();
      if (c.done) {
        b = a.indexOf(e);
        if (-1 !== b) {
          a.splice(b, 1);
        }
        return a;
      }
      a.push(c.value);
    }
  };
  Object.defineProperty(__f, "name", { value: "v" });
  return __f;
}

function __mk134(a, c) {
  "use strict";
  return {remove(d) {
    let b;
    a: {
      a.value = c(a.value, d);
      b = a.value[0];
      if (b == null) {
        break a;
      }
      b.resume();
    }
  }}.remove;
}

function __mk135(i, j, k, l, m) {
  "use strict";
  return (f, h) => {
    let c, e, g, b, a, d;
    if (f == null) {
      throw new TypeError(__s0);
    }
    c = f.container;
    e = Reflect.ownKeys(f);
    g = {};
    b = 0;
    while (b < e.length) {
      a: {
        a = e[b];
        if (a !== "container") {
          d = Object.prototype.propertyIsEnumerable.call(f, a);
          break a;
        }
        d = a !== "container";
      }
      if (d) {
        d = {value: f[a], writable: true, enumerable: true, configurable: true};
        Object.defineProperty(g, a, d);
      }
      b += 1;
    }
    b: {
      e = (j.value.useState(false)[Symbol.iterator])();
      b = e.next();
      if (b.done) {
        a = true;
        b = void 0;
        break b;
      }
      b = b.value;
      a = false;
    }
    c: {
      if (!a) {
        d = e.next();
        if (d.done) {
          a = true;
          d = void 0;
          break c;
        }
        d = d.value;
        break c;
      }
      d = void 0;
    }
    if (!a) {
      e.return != null && e.return();
    }
    d: {
      (0 , i.f)(__mk136(d), []);
      if (c) {
        break d;
      }
      e: {
        if (b) {
          f: {
            if (globalThis == null) {
              c = void 0;
              break f;
            }
            c = globalThis.document;
            c = c == null ? void 0 : c.body;
          }
          break e;
        }
        c = b;
      }
    }
    g: {
      if (c) {
        e = m.default;
        b = e.createPortal;
        a = {};
        Object.assign(a, g);
        Object.defineProperty(a, "ref", {value: h, writable: true, enumerable: true, configurable: true});
        g = (0 , l.jsx)(k.V.div, a);
        c = b.call(e, g, c);
        break g;
      }
      c = null;
    }
    return c;
  };
}

function __mk136(a) {
  "use strict";
  return () => {
    return a(true);
  };
}

function __mk138(g, h, i, f) {
  "use strict";
  return function(e) {
    let b, a, d, c;
    a: {
      b = f.useState;
      a = i();
      b = (b.call(f, a)[Symbol.iterator])();
      a = b.next();
      if (a.done) {
        d = true;
        a = void 0;
        break a;
      }
      a = a.value;
      d = false;
    }
    b: {
      if (!d) {
        c = b.next();
        if (c.done) {
          d = true;
          c = void 0;
          break b;
        }
        c = c.value;
        break b;
      }
      c = void 0;
    }
    if (!d) {
      b.return != null && b.return();
    }
    (0 , g.f)(__mk139(e, h, c), [e]);
    return e || (a ? "radix-" + `${a}` : "");
  };
}

function __mk139(a, b, c) {
  "use strict";
  return () => {
    a: {
      if (a) {
        break a;
      }
      c(__mk140(b));
    }
  };
}

function __mk140(b) {
  "use strict";
  return (c) => {
    let a;
    a: {
      if (c == null) {
        a = -(-b.value);
        b.value = __pe_inc(a);
        a = String(a);
        break a;
      }
      a = c;
    }
    return a;
  };
}

function __mk143(h, i, j, k, l) {
  "use strict";
  return (f, m) => {
    let c, e, g, b, a, d;
    if (f == null) {
      throw new TypeError(__s0);
    }
    c = f.container;
    e = Reflect.ownKeys(f);
    g = {};
    b = 0;
    while (b < e.length) {
      a: {
        a = e[b];
        if (a !== "container") {
          d = Object.prototype.propertyIsEnumerable.call(f, a);
          break a;
        }
        d = a !== "container";
      }
      if (d) {
        d = {value: f[a], writable: true, enumerable: true, configurable: true};
        Object.defineProperty(g, a, d);
      }
      b += 1;
    }
    b: {
      e = (l.useState(false)[Symbol.iterator])();
      b = e.next();
      if (b.done) {
        a = true;
        b = void 0;
        break b;
      }
      b = b.value;
      a = false;
    }
    c: {
      if (!a) {
        d = e.next();
        if (d.done) {
          a = true;
          d = void 0;
          break c;
        }
        d = d.value;
        break c;
      }
      d = void 0;
    }
    if (!a) {
      e.return != null && e.return();
    }
    d: {
      (0 , j.f)(__mk144(d), []);
      if (c) {
        break d;
      }
      e: {
        if (b) {
          f: {
            if (globalThis == null) {
              c = void 0;
              break f;
            }
            c = globalThis.document;
            c = c == null ? void 0 : c.body;
          }
          break e;
        }
        c = b;
      }
    }
    g: {
      if (c) {
        e = i.default;
        b = e.createPortal;
        a = {};
        Object.assign(a, g);
        Object.defineProperty(a, "ref", {value: m, writable: true, enumerable: true, configurable: true});
        g = (0 , h.jsx)(k.V.div, a);
        c = b.call(e, g, c);
        break g;
      }
      c = null;
    }
    return c;
  };
}

function __mk144(a) {
  "use strict";
  return () => {
    return a(true);
  };
}

function __mk146(m, q, p, c) {
  "use strict";
  return {o: (n) => {
    let b, i, d, e, a, g, l, j, h, k, f;
    if (n == null) {
      throw new TypeError(__s0);
    }
    a: {
      b = n.present;
      i = n.children;
      d = (c.useState()[Symbol.iterator])();
      e = d.next();
      if (e.done) {
        a = true;
        e = void 0;
        break a;
      }
      e = e.value;
      a = false;
    }
    b: {
      if (!a) {
        g = d.next();
        if (g.done) {
          a = true;
          g = void 0;
          break b;
        }
        g = g.value;
        break b;
      }
      g = void 0;
    }
    if (!a) {
      d.return != null && d.return();
    }
    c: {
      a = c.useRef({});
      d = c.useRef(b);
      l = c.useRef("none");
      j = (c.useReducer(__mk147({value: {mounted: {UNMOUNT: "unmounted", ANIMATION_OUT: "unmountSuspended"}, unmountSuspended: {MOUNT: "mounted", ANIMATION_END: "unmounted"}, unmounted: {MOUNT: "mounted"}}}), b ? "mounted" : "unmounted")[Symbol.iterator])();
      h = j.next();
      if (h.done) {
        k = true;
        h = void 0;
        break c;
      }
      h = h.value;
      k = false;
    }
    d: {
      if (!k) {
        f = j.next();
        if (f.done) {
          k = true;
          f = void 0;
          break d;
        }
        f = f.value;
        break d;
      }
      f = void 0;
    }
    if (!k) {
      j.return != null && j.return();
    }
    e: {
      c.useEffect(__mk148(l, h, m, a), [h]);
      (0 , p.f)(__mk149(d, l, f, {value: b}, m, a), [b, f]);
      (0 , p.f)(__mk150(d, l, f, m, a, e), [e, f]);
      d = ["mounted", "unmountSuspended"].includes(h);
      g = c.useCallback(__mk155(g, a), []);
      if ("function" == typeof i) {
        b = i({present: d});
        break e;
      }
      b = c.Children.only(i);
    }
    f: {
      e = q.value.j;
      a = Object.getOwnPropertyDescriptor(b.props, "ref");
      a = a == null ? void 0 : a.get;
      if (a && "isReactWarning" in a && a.isReactWarning) {
        a = b.ref;
        break f;
      }
      a = Object.getOwnPropertyDescriptor(b, "ref");
      a = a == null ? void 0 : a.get;
      a = a && "isReactWarning" in a && a.isReactWarning ? b.props.ref : b.props.ref || b.ref;
    }
    g: {
      e = e(g, a);
      if ("function" == typeof i || d) {
        b = c.cloneElement(b, {ref: e});
        break g;
      }
      b = null;
    }
    return b;
  }}.o;
}

function __mk147(b) {
  "use strict";
  return (a, c) => {
    return b.value[a][c] ?? a;
  };
}

function __mk148(b, c, d, e) {
  "use strict";
  return () => {
    let a;
    a = d(e.current);
    b.current = "mounted" === c ? a : "none";
  };
}

function __mk149(f, h, b, d, i, j) {
  "use strict";
  return () => {
    let a, e, g, c;
    a = j.current;
    e = f.current;
    if (e !== d.value) {
      a: {
        g = h.current;
        c = i(a);
        if (d.value) {
          b("MOUNT");
          break a;
        }
        b: {
          if ("none" === c) {
            a = "none" === c;
            break b;
          }
          a = (a == null ? void 0 : a.display) === "none";
        }
        if (a) {
          b("UNMOUNT");
          break a;
        }
        if (e && g !== c) {
          b("ANIMATION_OUT");
          break a;
        }
        b("UNMOUNT");
      }
      f.current = d.value;
    }
  };
}

function __mk150(i, j, f, g, h, a) {
  "use strict";
  return () => {
    let c, d, e, b;
    if (a) {
      c = a.ownerDocument.defaultView ?? window;
      d = __mk151(j, g, h, a);
      a.addEventListener("animationstart", d);
      e = __o0();
      b = __mk152(i, f, e, g, h, c, a);
      a.addEventListener("animationcancel", b);
      a.addEventListener("animationend", b);
      return __mk154(e, b, d, c, a);
    }
    f("ANIMATION_END");
    return;
  };
}

function __mk151(a, b, c, d) {
  "use strict";
  return {r: (e) => {
    if (e.target === d) {
      a.current = b(c.current);
    }
  }}.r;
}

function __mk152(e, f, g, h, i, c, b) {
  "use strict";
  return {n: (d) => {
    let a;
    a = h(i.current).includes(d.animationName);
    a = d.target === b && a;
    if (a) {
      f("ANIMATION_END");
      a = !e.current;
    }
    if (a) {
      a = b.style.animationFillMode;
      b.style.animationFillMode = "forwards";
      g.value = c.setTimeout(__mk153(a, b));
    }
  }}.n;
}

function __mk153(b, a) {
  "use strict";
  return () => {
    if ("forwards" === a.style.animationFillMode) {
      a.style.animationFillMode = b;
    }
  };
}

function __mk154(c, b, d, e, a) {
  "use strict";
  return () => {
    e.clearTimeout(c.value);
    a.removeEventListener("animationstart", d);
    a.removeEventListener("animationcancel", b);
    a.removeEventListener("animationend", b);
  };
}

function __mk155(b, c) {
  "use strict";
  return (a) => {
    if (a) {
      c.current = getComputedStyle(a);
    }
    b(a);
  };
}

function __mk158(i, l, h, j) {
  "use strict";
  return (f, k) => {
    let b, c, e, a, d, g;
    if (f == null) {
      throw new TypeError(__s0);
    }
    b = f.children;
    c = Reflect.ownKeys(f);
    e = {};
    a = 0;
    while (a < c.length) {
      a: {
        d = c[a];
        if (d !== "children") {
          g = Object.prototype.propertyIsEnumerable.call(f, d);
          break a;
        }
        g = d !== "children";
      }
      if (g) {
        g = {value: f[d], writable: true, enumerable: true, configurable: true};
        Object.defineProperty(e, d, g);
      }
      a += 1;
    }
    c = h.value.Children.toArray(b);
    a = c.find(l);
    if (a) {
      b: {
        b = a.props.children;
        a = __mk159(a, b, h);
        c = c.map(a);
        a = {};
        Object.assign(a, e);
        Object.defineProperty(a, "ref", {value: k, writable: true, enumerable: true, configurable: true});
        e = i.jsx;
        d = j.value;
        if (h.value.isValidElement(b)) {
          b = h.value.cloneElement(b, void 0, c);
          break b;
        }
        b = null;
      }
      Object.defineProperty(a, "children", {value: b, writable: true, enumerable: true, configurable: true});
      return e.call(i, d, a);
    }
    a = {};
    Object.assign(a, e);
    Object.defineProperty(a, "ref", {value: k, writable: true, enumerable: true, configurable: true});
    Object.defineProperty(a, "children", {value: b, writable: true, enumerable: true, configurable: true});
    return (0 , i.jsx)(j.value, a);
  };
}

function __mk159(e, b, c) {
  "use strict";
  return (d) => {
    let a;
    a: {
      if (d !== e) {
        a = d;
        break a;
      }
      b: {
        if (c.value.Children.count(b) > 1) {
          a = c.value.Children.only(null);
          break b;
        }
        a = c.value.isValidElement(b) ? b.props.children : null;
      }
    }
    return a;
  };
}

function __mk160(b, c) {
  "use strict";
  return function s(a) {
    return c.value.isValidElement(a) && a.type === b.value;
  };
}

function __mk161(o, k) {
  "use strict";
  return (j, n) => {
    let b, a, m, e, d, g, h, c, f, i, l;
    if (j == null) {
      throw new TypeError(__s0);
    }
    b = j.children;
    a = Reflect.ownKeys(j);
    m = {};
    e = 0;
    while (e < a.length) {
      a: {
        d = a[e];
        if (d !== "children") {
          g = Object.prototype.propertyIsEnumerable.call(j, d);
          break a;
        }
        g = d !== "children";
      }
      if (g) {
        g = {value: j[d], writable: true, enumerable: true, configurable: true};
        Object.defineProperty(m, d, g);
      }
      e += 1;
    }
    if (k.value.isValidElement(b)) {
      b: {
        a = Object.getOwnPropertyDescriptor(b.props, "ref");
        a = a == null ? void 0 : a.get;
        if (a && "isReactWarning" in a && a.isReactWarning) {
          a = b.ref;
          break b;
        }
        a = Object.getOwnPropertyDescriptor(b, "ref");
        a = a == null ? void 0 : a.get;
        a = a && "isReactWarning" in a && a.isReactWarning ? b.props.ref : b.props.ref || b.ref;
      }
      e = b.props;
      d = {};
      Object.assign(d, e);
      for (f in e) {
        c: {
          i = m[f];
          l = e[f];
          c = /^on[A-Z]/;
          if (c.test(f)) {
            if (i && l) {
              c = __mk162(l, i);
              d[f] = c;
              break c;
            }
            if (i) {
              d[f] = i;
              break c;
            }
            break c;
          }
          if ("style" === f) {
            c = {};
            Object.assign(c, i);
            Object.assign(c, l);
            d[f] = c;
            break c;
          }
          if ("className" === f) {
            c = [i, l];
            d[f] = c.filter(Boolean).join(" ");
          }
        }
      }
      c = {};
      Object.assign(c, m);
      Object.assign(c, d);
      if (b.type !== k.value.Fragment) {
        if (n) {
          a = (0 , o.Q)(n, a);
        }
        c.ref = a;
      }
      return k.value.cloneElement(b, c);
    }
    d: {
      if (k.value.Children.count(b) > 1) {
        b = k.value.Children.only(null);
        break d;
      }
      b = null;
    }
    return b;
  };
}

function __mk162(f, g) {
  "use strict";
  return function() {
    let b, c, a, d, e;
    const h = arguments;
    b = h.length;
    c = Array(b);
    a = 0;
    while (a < b) {
      c[a] = h[a];
      a += 1;
    }
    b = f.apply;
    a = [];
    d = (c[Symbol.iterator])();
    while (true) {
      e = d.next();
      if (e.done) {
        b.call(f, void 0, a);
        b = g.apply;
        a = [];
        c = (c[Symbol.iterator])();
        while (true) {
          d = c.next();
          if (d.done) {
            b.call(g, void 0, a);
            return;
          }
          a.push(d.value);
        }
      }
      a.push(e.value);
    }
  };
}

function __mk163(a) {
  "use strict";
  return {l: (b) => {
    let c;
    if (b == null) {
      throw new TypeError(__s0);
    }
    c = {children: b.children};
    return (0 , a.jsx)(a.Fragment, c);
  }}.l;
}

function __mk164(f, g, e) {
  "use strict";
  return (h, a) => {
    let c, b, d;
    a: {
      c = e.value.forwardRef.call(e.value, __mk165(f, a, g));
      c.displayName = "Primitive." + `${a}`;
      b = {};
      Object.assign(b, h);
      if (typeof a === "symbol") {
        d = a;
        break a;
      }
      d = String(a);
    }
    Object.defineProperty(b, d, {value: c, writable: true, enumerable: true, configurable: true});
    return b;
  };
}

function __mk165(h, i, k) {
  "use strict";
  return (c, j) => {
    let g, a, f, d, b, e;
    if (c == null) {
      throw new TypeError(__s0);
    }
    g = c.asChild;
    a = Reflect.ownKeys(c);
    f = {};
    d = 0;
    while (d < a.length) {
      a: {
        b = a[d];
        if (b !== "asChild") {
          e = Object.prototype.propertyIsEnumerable.call(c, b);
          break a;
        }
        e = b !== "asChild";
      }
      if (e) {
        e = {value: c[b], writable: true, enumerable: true, configurable: true};
        Object.defineProperty(f, b, e);
      }
      d += 1;
    }
    if ("u" > typeof window) {
      window[Symbol.for("radix-ui")] = true;
    }
    a = {};
    Object.assign(a, f);
    Object.defineProperty(a, "ref", {value: j, writable: true, enumerable: true, configurable: true});
    return (0 , k.jsx)(g ? h : i, a);
  };
}

function __mk166(a) {
  "use strict";
  return function(b, c) {
    if (b) {
      a.value.flushSync.call(a.value, __mk167(b, c));
    }
  };
}

function __mk167(a, b) {
  "use strict";
  return () => {
    return a.dispatchEvent(b);
  };
}

function __mk169(d, e, f, a) {
  "use strict";
  return function i(c) {
    let b;
    b = a.value.forwardRef.call(a.value, __mk170(f, a));
    b.displayName = `${c}` + ".SlotClone";
    b = a.value.forwardRef.call(a.value, __mk172(d, e, a, {value: b}));
    b.displayName = `${c}` + ".Slot";
    return b;
  };
}

function __mk170(o, j) {
  "use strict";
  return (k, n) => {
    let b, a, m, e, d, g, h, c, f, i, l;
    if (k == null) {
      throw new TypeError(__s0);
    }
    b = k.children;
    a = Reflect.ownKeys(k);
    m = {};
    e = 0;
    while (e < a.length) {
      a: {
        d = a[e];
        if (d !== "children") {
          g = Object.prototype.propertyIsEnumerable.call(k, d);
          break a;
        }
        g = d !== "children";
      }
      if (g) {
        g = {value: k[d], writable: true, enumerable: true, configurable: true};
        Object.defineProperty(m, d, g);
      }
      e += 1;
    }
    if (j.value.isValidElement(b)) {
      b: {
        a = Object.getOwnPropertyDescriptor(b.props, "ref");
        a = a == null ? void 0 : a.get;
        if (a && "isReactWarning" in a && a.isReactWarning) {
          a = b.ref;
          break b;
        }
        a = Object.getOwnPropertyDescriptor(b, "ref");
        a = a == null ? void 0 : a.get;
        a = a && "isReactWarning" in a && a.isReactWarning ? b.props.ref : b.props.ref || b.ref;
      }
      e = b.props;
      d = {};
      Object.assign(d, e);
      for (f in e) {
        c: {
          i = m[f];
          l = e[f];
          c = /^on[A-Z]/;
          if (c.test(f)) {
            if (i && l) {
              c = __mk171(l, i);
              d[f] = c;
              break c;
            }
            if (i) {
              d[f] = i;
              break c;
            }
            break c;
          }
          if ("style" === f) {
            c = {};
            Object.assign(c, i);
            Object.assign(c, l);
            d[f] = c;
            break c;
          }
          if ("className" === f) {
            c = [i, l];
            d[f] = c.filter(Boolean).join(" ");
          }
        }
      }
      c = {};
      Object.assign(c, m);
      Object.assign(c, d);
      if (b.type !== j.value.Fragment) {
        if (n) {
          a = (0 , o.value.Q)(n, a);
        }
        c.ref = a;
      }
      return j.value.cloneElement(b, c);
    }
    d: {
      if (j.value.Children.count(b) > 1) {
        b = j.value.Children.only(null);
        break d;
      }
      b = null;
    }
    return b;
  };
}

function __mk171(f, g) {
  "use strict";
  return function() {
    let b, c, a, e, d;
    const h = arguments;
    b = h.length;
    c = Array(b);
    a = 0;
    while (a < b) {
      c[a] = h[a];
      a += 1;
    }
    b = f.apply;
    a = [];
    e = (c[Symbol.iterator])();
    while (true) {
      d = e.next();
      if (d.done) {
        b = b.call(f, void 0, a);
        a = g.apply;
        e = [];
        c = (c[Symbol.iterator])();
        while (true) {
          d = c.next();
          if (d.done) {
            a.call(g, void 0, e);
            return b;
          }
          e.push(d.value);
        }
      }
      a.push(d.value);
    }
  };
}

function __mk172(l, i, h, j) {
  "use strict";
  return (f, k) => {
    let b, c, e, a, d, g;
    if (f == null) {
      throw new TypeError(__s0);
    }
    b = f.children;
    c = Reflect.ownKeys(f);
    e = {};
    a = 0;
    while (a < c.length) {
      a: {
        d = c[a];
        if (d !== "children") {
          g = Object.prototype.propertyIsEnumerable.call(f, d);
          break a;
        }
        g = d !== "children";
      }
      if (g) {
        g = {value: f[d], writable: true, enumerable: true, configurable: true};
        Object.defineProperty(e, d, g);
      }
      a += 1;
    }
    c = h.value.Children.toArray(b);
    a = c.find(l.value);
    if (a) {
      b: {
        b = a.props.children;
        a = __mk173(a, b, h);
        c = c.map(a);
        a = {};
        Object.assign(a, e);
        Object.defineProperty(a, "ref", {value: k, writable: true, enumerable: true, configurable: true});
        e = i.value.jsx;
        d = j.value;
        if (h.value.isValidElement(b)) {
          b = h.value.cloneElement(b, void 0, c);
          break b;
        }
        b = null;
      }
      Object.defineProperty(a, "children", {value: b, writable: true, enumerable: true, configurable: true});
      return e(d, a);
    }
    a = {};
    Object.assign(a, e);
    Object.defineProperty(a, "ref", {value: k, writable: true, enumerable: true, configurable: true});
    Object.defineProperty(a, "children", {value: b, writable: true, enumerable: true, configurable: true});
    return (0 , i.value.jsx)(j.value, a);
  };
}

function __mk173(e, b, c) {
  "use strict";
  return (d) => {
    let a;
    a: {
      if (d !== e) {
        a = d;
        break a;
      }
      b: {
        if (c.value.Children.count(b) > 1) {
          a = c.value.Children.only(null);
          break b;
        }
        a = c.value.isValidElement(b) ? b.props.children : null;
      }
    }
    return a;
  };
}

function __mk174(b, c) {
  "use strict";
  return function l(a) {
    return b.value.isValidElement(a) && "function" == typeof a.type && "__radixId" in a.type && a.type.__radixId === c.value;
  };
}

function __mk175(g, h, e) {
  "use strict";
  return (f, a) => {
    let b, c, d;
    a: {
      b = (0 , g.value)("Primitive." + `${a}`);
      b = e.value.forwardRef.call(e.value, __mk176(a, h, b));
      b.displayName = "Primitive." + `${a}`;
      c = {};
      Object.assign(c, f);
      if (typeof a === "symbol") {
        d = a;
        break a;
      }
      d = String(a);
    }
    Object.defineProperty(c, d, {value: b, writable: true, enumerable: true, configurable: true});
    return c;
  };
}

function __mk176(h, i, j) {
  "use strict";
  return (c, k) => {
    let g, a, f, d, b, e;
    if (c == null) {
      throw new TypeError(__s0);
    }
    g = c.asChild;
    a = Reflect.ownKeys(c);
    f = {};
    d = 0;
    while (d < a.length) {
      a: {
        b = a[d];
        if (b !== "asChild") {
          e = Object.prototype.propertyIsEnumerable.call(c, b);
          break a;
        }
        e = b !== "asChild";
      }
      if (e) {
        e = {value: c[b], writable: true, enumerable: true, configurable: true};
        Object.defineProperty(f, b, e);
      }
      d += 1;
    }
    if ("u" > typeof window) {
      window[Symbol.for("radix-ui")] = true;
    }
    a = {};
    Object.assign(a, f);
    Object.defineProperty(a, "ref", {value: k, writable: true, enumerable: true, configurable: true});
    return (0 , i.value.jsx)(g ? j : h, a);
  };
}

function __mk177(a) {
  "use strict";
  return function(b, c) {
    if (b) {
      a.value.flushSync.call(a.value, __mk178(b, c));
    }
  };
}

function __mk178(a, b) {
  "use strict";
  return () => {
    return a.dispatchEvent(b);
  };
}

function __mk180(a) {
  "use strict";
  return function(c) {
    let b;
    b = a.useRef(c);
    a.useEffect(__mk181(c, b));
    return a.useMemo(__mk182(b), []);
  };
}

function __mk181(a, b) {
  "use strict";
  return () => {
    b.current = a;
  };
}

function __mk182(a) {
  "use strict";
  return () => {
    return __mk183(a);
  };
}

function __mk183(e) {
  "use strict";
  return function() {
    let a, c, b, f, d;
    const g = arguments;
    a = g.length;
    c = Array(a);
    b = 0;
    while (b < a) {
      c[b] = g[b];
      b += 1;
    }
    a: {
      a = e.current;
      if (a == null) {
        a = void 0;
        break a;
      }
      b = [];
      f = a.apply;
      c = (c[Symbol.iterator])();
      while (true) {
        d = c.next();
        if (d.done) {
          a = f.call(a, e, b);
          break a;
        }
        b.push(d.value);
      }
    }
    return a;
  };
}

function __mk185(i, g) {
  "use strict";
  return function(h) {
    let f, e, d, b, a, c;
    if (h == null) {
      throw new TypeError(__s0);
    }
    f = h.prop;
    e = h.defaultProp;
    d = h.onChange;
    if (d === void 0) {
      d = ({i() {
  "use strict";
}}.i);
    }
    a: {
      e = g.useState(e);
      b = (e[Symbol.iterator])();
      a = b.next();
      if (a.done) {
        c = true;
        a = void 0;
        break a;
      }
      a = a.value;
      c = false;
    }
    if (!c) {
      b.return != null && b.return();
    }
    b: {
      b = g.useRef(a);
      c = (0 , i.f)(d);
      g.useEffect(__mk187(b, c, a), [a, b, c]);
      c = (e[Symbol.iterator])();
      e = c.next();
      if (e.done) {
        b = true;
        e = void 0;
        break b;
      }
      e = e.value;
      b = false;
    }
    c: {
      if (!b) {
        a = c.next();
        if (a.done) {
          b = true;
          a = void 0;
          break c;
        }
        a = a.value;
        break c;
      }
      a = void 0;
    }
    if (!b) {
      c.return != null && c.return();
    }
    d = (0 , i.f)(d);
    b = g.useCallback;
    c = [void 0 !== f, f, a, d];
    d = __mk188(d, a, f, void 0 !== f);
    d = b.call(g, d, c);
    return [void 0 !== f ? f : e, d];
  };
}

function __mk187(b, c, a) {
  "use strict";
  return () => {
    if (b.current !== a) {
      c(a);
      b.current = a;
    }
  };
}

function __mk188(d, e, c, f) {
  "use strict";
  return (a) => {
    let b;
    a: {
      if (f) {
        b: {
          if ("function" == typeof a) {
            b = a(c);
            break b;
          }
          b = a;
        }
        if (b !== c) {
          d(b);
          break a;
        }
        break a;
      }
      e(a);
    }
  };
}

function __mk194(m, n, h) {
  "use strict";
  return function(k) {
    let b, c, i, g, f, j, a, d, e, l;
    b = void 0 === k ? {debounce: 0, scroll: false, offsetSize: false} : k;
    if (b == null) {
      throw new TypeError(__s0);
    }
    a: {
      c = b.debounce;
      i = b.scroll;
      g = b.polyfill;
      b = b.offsetSize;
      if (g) {
        break a;
      }
      b: {
        if ("u" < typeof window) {
          g = ((0, class {
}));
          break b;
        }
        g = window.ResizeObserver;
      }
    }
    if (!g) {
      throw Error("This browser does not support ResizeObserver out of the box. See: https://github.com/react-spring/react-use-measure/#resize-observer-polyfills");
    }
    c: {
      f = ((0 , h.value.useState)({left: 0, top: 0, width: 0, height: 0, bottom: 0, right: 0, x: 0, y: 0})[Symbol.iterator])();
      j = f.next();
      if (j.done) {
        a = true;
        j = void 0;
        break c;
      }
      j = j.value;
      a = false;
    }
    d: {
      if (!a) {
        d = f.next();
        if (d.done) {
          a = true;
          d = void 0;
          break d;
        }
        d = d.value;
        break d;
      }
      d = void 0;
    }
    if (!a) {
      f.return != null && f.return();
    }
    e: {
      f = (0 , h.value.useRef)({element: null, scrollContainers: null, resizeObserver: null, lastBounds: j});
      a = c ? "number" == typeof c ? c : c.scroll : null;
      c = c ? "number" == typeof c ? c : c.resize : null;
      e = (0 , h.value.useRef)(false);
      (0 , h.value.useEffect)(__mk195(e));
      l = [d, b, a, c];
      f = {value: f};
      b = ((0 , h.value.useMemo)(__mk197(b, e, d, m, f, n, a, c), l)[Symbol.iterator])();
      c = b.next();
      if (c.done) {
        a = true;
        c = void 0;
        break e;
      }
      c = c.value;
      a = false;
    }
    f: {
      if (!a) {
        d = b.next();
        if (d.done) {
          a = true;
          d = void 0;
          break f;
        }
        d = d.value;
        break f;
      }
      d = void 0;
    }
    g: {
      if (!a) {
        e = b.next();
        if (e.done) {
          a = true;
          e = void 0;
          break g;
        }
        e = e.value;
        break g;
      }
      e = void 0;
    }
    if (!a) {
      b.return != null && b.return();
    }
    b = [e, !!i];
    a = __mk200({value: !!i}, {value: e});
    (0 , h.value.useEffect)(a, b);
    (0 , h.value.useEffect)(__mk202({value: d}), [d]);
    b = [i, e, d];
    a = {value: e};
    i = __mk205({value: g}, a, f, {value: i});
    g = __mk207(a, f);
    (0 , h.value.useEffect)(__mk204(i, g), b);
    (0 , h.value.useEffect)(__mk209(g), []);
    return [__mk210(i, f, g), j, c];
  };
}

function __mk195(a) {
  "use strict";
  return () => {
    a.current = true;
    return __mk196(a);
  };
}

function __mk196(a) {
  "use strict";
  return () => {
    a.current = false;
  };
}

function __mk197(f, g, h, e, i, j, d, k) {
  "use strict";
  return () => {
    let a, c, b;
    if (k) {
      a: {
        c = __mk198(f, g, h, i, j);
        a = (0 , e.default)(c, k);
        if (d) {
          b = (0 , e.default)(c, d);
          break a;
        }
        b = c;
      }
      return [c, a, b];
    }
    b: {
      a = __mk198(f, g, h, i, j);
      if (d) {
        b = (0 , e.default)(a, d);
        break b;
      }
      b = a;
    }
    return [a, a, b];
  };
}

function __mk198(m, k, n, c, l) {
  "use strict";
  return {e: () => {
    let a, b, g, d, f, h, i, j;
    if (!c.value.current.element) {
      return;
    }
    a = c.value.current.element.getBoundingClientRect();
    if (a == null) {
      throw new TypeError(__s0);
    }
    a: {
      b: {
        b = a.left;
        g = a.top;
        d = a.width;
        f = a.height;
        h = a.bottom;
        i = a.right;
        j = a.x;
        a = a.y;
        if (c.value.current.element instanceof HTMLElement && m) {
          d = c.value.current.element.offsetHeight;
          f = c.value.current.element.offsetWidth;
          a = {left: b, top: g, width: f, height: d, bottom: h, right: i, x: j, y: a};
          Object.freeze(a);
          b = k.current;
          if (b) {
            break b;
          }
          break a;
        }
        a = {left: b, top: g, width: d, height: f, bottom: h, right: i, x: j, y: a};
        Object.freeze(a);
        b = k.current;
        if (b) {
          break b;
        }
        break a;
      }
      b = c.value.current.lastBounds;
      b = !l.every(__mk199({value: b}, {value: a}));
    }
    if (b) {
      c.value.current.lastBounds = a;
      n(a);
    }
    return;
  }}.e;
}

function __mk199(b, c) {
  "use strict";
  return (a) => {
    return b.value[a] === c.value[a];
  };
}

function __mk200(b, a) {
  "use strict";
  return () => {
    if (b.value) {
      window.addEventListener("scroll", a.value, {capture: true, passive: true});
      return __mk201(a);
    }
    return;
  };
}

function __mk201(a) {
  "use strict";
  return () => {
    return void window.removeEventListener("scroll", a.value, true);
  };
}

function __mk202(a) {
  "use strict";
  return () => {
    window.addEventListener("resize", a.value);
    return __mk203(a);
  };
}

function __mk203(a) {
  "use strict";
  return () => {
    return void window.removeEventListener("resize", a.value);
  };
}

function __mk204(a, b) {
  "use strict";
  return () => {
    b();
    a();
  };
}

function __mk205(d, c, a, e) {
  "use strict";
  return function C() {
    let b;
    if (a.value.current.element) {
      b = new d.value(c.value);
      a.value.current.resizeObserver = b;
      a.value.current.resizeObserver.observe(a.value.current.element);
      if (e.value && a.value.current.scrollContainers) {
        b = a.value.current.scrollContainers;
        b.forEach(__mk206(c));
      }
    }
  };
}

function __mk206(b) {
  "use strict";
  return (a) => {
    return a.addEventListener("scroll", b.value, {capture: true, passive: true});
  };
}

function __mk207(c, a) {
  "use strict";
  return function w() {
    let b;
    if (a.value.current.scrollContainers) {
      b = a.value.current.scrollContainers;
      b.forEach(__mk208(c));
      a.value.current.scrollContainers = null;
    }
    if (a.value.current.resizeObserver) {
      a.value.current.resizeObserver.disconnect();
      a.value.current.resizeObserver = null;
    }
  };
}

function __mk208(a) {
  "use strict";
  return (b) => {
    return b.removeEventListener("scroll", a.value, true);
  };
}

function __mk209(a) {
  "use strict";
  return () => {
    return a;
  };
}

function __mk210(f, e, h) {
  "use strict";
  return (a) => {
    let c, g, b, d;
    a: {
      if (a && a !== e.value.current.element) {
        h();
        e.value.current.element = a;
        c = [];
        if (!a || a === document.body) {
          e.value.current.scrollContainers = c;
          f();
          break a;
        }
        g = e.value.current;
        b = window.getComputedStyle(a);
        if (b == null) {
          throw new TypeError(__s0);
        }
        if ([b.overflow, b.overflowX, b.overflowY].some(({""(a) {
  "use strict";
  return "auto" === a || "scroll" === a;
}}[""]))) {
          c.push(a);
        }
        b = [];
        c = (c[Symbol.iterator])();
        while (true) {
          d = c.next();
          if (d.done) {
            c = (a(a.parentElement)[Symbol.iterator])();
            while (true) {
              d = c.next();
              if (d.done) {
                g.scrollContainers = b;
                f();
                break a;
              }
              b.push(d.value);
            }
          }
          b.push(d.value);
        }
      }
    }
  };
}

function __mk215(g, h, i) {
  "use strict";
  return function(f) {
    let e, c, a, d, b;
    if (f == null) {
      throw new TypeError(__s0);
    }
    a: {
      e = f.children;
      c = ((0 , g.useState)(false)[Symbol.iterator])();
      a = c.next();
      if (a.done) {
        d = true;
        a = void 0;
        break a;
      }
      a = a.value;
      d = false;
    }
    b: {
      if (!d) {
        b = c.next();
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
      c.return != null && c.return();
    }
    e = {value: (0 , g.useMemo)(__mk216(a, b), [a]), children: e};
    return (0 , i.jsx)(h.Provider, e);
  };
}

function __mk216(a, b) {
  "use strict";
  return () => {
    return {forceShowTooltips: a, setForceShowTooltips: b};
  };
}

function __mk219(g, c, h, i, b, j, e, k, d) {
  return function a() {
    let f;
    const l = arguments;
    a: {
      d.value = this;
      c.value = l;
      h.value = Date.now();
      f = i && !b.value;
      b.value;
      if (b.value) {
        break a;
      }
      b.value = setTimeout(j.value, k.value);
    }
    if (f) {
      e.value = g.apply(d.value, c.value);
      c.value = null;
      d.value = null;
    }
    return e.value;
  };
}

function __mk220(f, b, g, h, c, i, j, d, e) {
  return function r() {
    let a;
    a: {
      a = Date.now() - g.value;
      if (a < d.value && a >= 0) {
        c.value = setTimeout(i.value, d.value - a);
        break a;
      }
      c.value = null;
      if (h) {
        break a;
      }
      j.value = f.apply(e.value, b.value);
      b.value = null;
      e.value = null;
    }
  };
}

function __mk221(a) {
  return function() {
    a.value;
    if (a.value) {
      clearTimeout(a.value);
      a.value = null;
    }
  };
}

function __mk222(d, b, a, e, c) {
  return function() {
    a.value;
    if (a.value) {
      e.value = d.apply(c.value, b.value);
      b.value = null;
      c.value = null;
      clearTimeout(a.value);
      a.value = null;
    }
  };
}

(function () {
  let a, b, g, c, d, i, h, f, j, k;
  a: {
    try {
      b = globalThis;
      g = (new b.Error()).stack;
      c = g;
      if (c) {
        b: {
          d = b._debugIds;
          if (d) {
            break b;
          }
          i = b;
          a = {};
          h = a;
          i._debugIds = h;
          d = h;
        }
        d[g] = __s1;
        c = __s1;
        c = __s1;
      }
    } catch (l) {
    }
    f = globalThis.TURBOPACK;
    if (f) {
      break a;
    }
    a = [];
    f = a;
    TURBOPACK = a;
  }
  k = [408761, 344164, 212129, 127781, 19299, 593688, 150716, ({""(a) {
  "use strict";
  let i, b, d, g, p, l, c, f, h, q, m, n, j, k, o;
  a.s(["f", 0, (function t(d) {
  "use strict";
  let a, c, b, e, f;
  a = arguments.length;
  c = Array(a > 1 ? a - 1 : 0);
  b = 1;
  while (b < a) {
    c[b - 1] = arguments[b];
    b += 1;
  }
  a = new URL("https://base-ui.com/production-error");
  b = a.searchParams;
  e = b.set;
  f = d.toString();
  e.call(b, "code", f);
  c.forEach(__mk2(a));
  a = `${a}`;
  return "Base UI error #" + `${d}` + "; visit " + a + " for the full message.";
})], 344164);
  i = a.i(993856);
  i = {value: i};
  b = {};
  b = {value: b};
  b = __mk3(i, b);
  a.s(["f", 0, b], 212129);
  d = (function l() {
  "use strict";
  return {callback: null, cleanup: null, refs: []};
});
  d = {value: d};
  b = {value: b};
  g = (function s(c, a) {
  "use strict";
  let b;
  c.refs = a;
  b = c;
  if (a.every(({""(a) {
  "use strict";
  return null == a;
}}[""]))) {
    b.callback = null;
    return;
  }
  b.callback = ({""(c) {
  "use strict";
  let d, b, a, f;
  if (e.cleanup) {
    e.cleanup();
    e.cleanup = null;
  }
  if (null != c) {
    d = Array(t.length).fill(null);
    b = 0;
    while (b < t.length) {
      a: {
        a = t[b];
        if (null != a) {
          f = typeof a;
          if (typeof a === "function") {
            a = a(c);
            if ("function" == typeof a) {
              d[b] = a;
              break a;
            }
            break a;
          }
          if (f === "object") {
            a.current = c;
          }
        }
      }
      b += 1;
    }
    e.cleanup = __mk9(d);
  }
}}[""]);
  return;
});
  g = {value: g};
  p = __mk4(d, b, g);
  b = __mk10(d, b, g);
  a.s(["A", 0, p, "f", 0, b], 127781);
  d = parseInt(i.value.version, 10);
  d = {value: d};
  d = __mk12(d);
  a.s(["f", 0, d], 19299);
  Object.freeze([]);
  g = Object.freeze({});
  a.s(["v", 0, g, "w", 0, (function() {
  "use strict";
})], 593688);
  l = (function O(a, b) {
  "use strict";
  return b ? a ? b + " " + a : b : a;
});
  c = (function N(a) {
  "use strict";
  a.preventBaseUIHandler = __mk21(a);
  return a;
});
  c = {value: c};
  f = (function T(a) {
  "use strict";
  return null != a && "object" == typeof a && "nativeEvent" in a;
});
  f = {value: f};
  h = __mk18(c, f);
  h = {value: h};
  q = {value: l};
  m = (function b(a, d) {
  "use strict";
  let e, f, c;
  e = a.charCodeAt(0);
  f = a.charCodeAt(1);
  c = a.charCodeAt(2);
  return 111 === e && 110 === f && c >= 65 && c <= 90 && ("function" == typeof d || void 0 === d);
});
  m = {value: m};
  n = (function d(b, c) {
  "use strict";
  let a;
  a: {
    if (b && !c) {
      a = b;
      break a;
    }
    b: {
      if (!b && c) {
        a = c;
        break b;
      }
      c: {
        if (b || c) {
          a = {};
          Object.assign(a, b);
          Object.assign(a, c);
          break c;
        }
        a = void 0;
      }
    }
  }
  return a;
});
  n = {value: n};
  j = (function g(a) {
  "use strict";
  return "function" == typeof a;
});
  j = {value: j};
  k = {};
  k = {value: k};
  o = __mk26(j, k);
  o = {value: o};
  c = __mk16(h, c, q, f, m, n, j, o);
  c = {value: c};
  f = __mk27(h, m, j, k, o);
  f = {value: f};
  h = __mk15(c, f);
  c = __mk28(c, f, k);
  a.s(["c", 0, l, "w", 0, h, "b", 0, c], 150716);
  l = Symbol.for("react.lazy");
  a.s(["f", 0, __mk29(l, q, n, {value: __mk32({value: d}, i)}, {value: p}, g, i, {value: b}, h, c)], 408761);
}}[""]), 178896, 789091, ({""(a) {
  "use strict";
  let b, c;
  a.s(["f", 0, (function(b, c) {
  "use strict";
  let a;
  a: {
    if (arguments.length > 2 && void 0 !== arguments[2]) {
      a = arguments[2];
      break a;
    }
    a = {};
  }
  if (a == null) {
    throw new TypeError("Cannot destructure a null or undefined value");
  }
  a = a.checkForDefaultPrevented;
  a = a === void 0 ? true : a;
  return __mk35(b, a, c);
})], 178896);
  b = a.i(993856);
  c = a.i(814996);
  a.s(["e", 0, __mk36(c, b), "c", 0, __mk40(c, b)], 789091);
}}[""]), 420341, ({""(b) {
  "use strict";
  let c, a;
  c = b.i(993856);
  a = (function n(a, b) {
  "use strict";
  if ("function" == typeof a) {
    return a(b);
  }
  if (null != a) {
    a.current = b;
  }
  return;
});
  a = {value: a};
  a = __mk56(a);
  b.s(["Q", 0, a, "j", 0, __mk61({value: a}, c)]);
}}[""]), 820445, ({""(b) {
  "use strict";
  let c, a;
  c = b.i(993856);
  a = (function n(a, b) {
  "use strict";
  if ("function" == typeof a) {
    return a(b);
  }
  if (null != a) {
    a.current = b;
  }
  return;
});
  a = {value: a};
  a = __mk63(a);
  b.s(["Q", 0, a, "j", 0, __mk68({value: a}, c)]);
}}[""]), 500292, ({""(b) {
  "use strict";
  let a, d, c, g, j, h, e, f, i;
  a = b.i(993856);
  d = b.i(178896);
  c = b.i(902563);
  g = b.i(420341);
  j = b.i(134715);
  h = b.i(814996);
  e = a.createContext;
  f = {layers: new Set(), layersWithOutsidePointerEventsDisabled: new Set(), branches: new Set()};
  e = e.call(a, f);
  c = {value: c};
  f = __mk102(c);
  i = {value: "dismissableLayer.update"};
  d = a.forwardRef(__mk70(e, f, __mk103(i), g, h, a, c, d, i, {value: void 0}, j));
  d.displayName = "DismissableLayer";
  a.forwardRef(__mk104(e, g, h, a, c)).displayName = "DismissableLayerBranch";
  b.s(["f", 0, d], 500292);
}}[""]), 967251, ({""(a) {
  "use strict";
  let b;
  b = a.i(993856);
  a.s(["f", 0, __mk108({value: 0}, (function r() {
  "use strict";
  let a;
  a = document.createElement("span");
  a.setAttribute("data-radix-focus-guard", "");
  a.tabIndex = 0;
  a.style.outline = "none";
  a.style.opacity = "0";
  a.style.position = "fixed";
  a.style.pointerEvents = "none";
  return a;
}), b)]);
}}[""]), 81290, 390685, __mk113(), 65525, ((a) => {
  "use strict";
  let c, d, b;
  a: {
    c = a.i(993856);
    d = a.i(374458);
    b = c[("useId").toString()];
    if (b) {
      break a;
    }
    b = ({""() {
  "use strict";
}}[""]);
  }
  a.s(["f", 0, __mk138(d, {value: 0}, b, c)]);
}), 378099, ({""(a) {
  "use strict";
  let b, c, d, e, f;
  b = a.i(993856);
  c = a.i(455056);
  d = a.i(461773);
  e = a.i(760463);
  f = a.i(814996);
  b = b.forwardRef(__mk143(f, c, e, d, b));
  b.displayName = "Portal";
  a.s(["f", 0, b]);
}}[""]), 453224, ({""(a) {
  "use strict";
  let b, c;
  b = a.i(993856);
  c = a.i(420341);
  b = __mk146((function i(a) {
  "use strict";
  return (a == null ? void 0 : a.animationName) || "none";
}), {value: c}, a.i(374458), b);
  b.displayName = "Presence";
  a.s(["f", 0, b]);
}}[""]), 902563, 426825, ({""(a) {
  "use strict";
  let b, h, i, e, g, d, c, f;
  b = a.i(993856);
  h = a.i(455056);
  i = a.i(420341);
  e = a.i(814996);
  g = {value: void 0};
  d = {value: b};
  c = __mk160(g, d);
  f = {value: void 0};
  c = b.forwardRef(__mk158(e, c, d, f));
  c.displayName = "Slot";
  f.value = b.forwardRef(__mk161(i, d));
  f.value.displayName = "SlotClone";
  g.value = __mk163(e);
  a.s(["f", 0, c], 426825);
  b = ["a", "button", "div", "form", "h2", "h3", "img", "input", "label", "li", "nav", "ol", "p", "span", "svg", "ul"].reduce(__mk164(c, e, d), {});
  a.s(["V", 0, b, "u", 0, __mk166({value: h})], 902563);
}}[""]), 461773, 334912, ({""(a) {
  "use strict";
  let b, f, d, e, c;
  b = a.i(993856);
  f = a.i(455056);
  d = a.i(820445);
  e = a.i(814996);
  c = Symbol("radix.slottable");
  b = {value: b};
  c = {value: c};
  c = __mk174(b, c);
  c = {value: c};
  e = {value: e};
  d = {value: d};
  d = __mk169(c, e, d, b);
  a.s(["f", 0, d], 334912);
  b = ["a", "button", "div", "form", "h2", "h3", "img", "input", "label", "li", "nav", "ol", "p", "select", "span", "svg", "ul"].reduce(__mk175({value: d}, e, b), {});
  a.s(["V", 0, b, "u", 0, __mk177({value: f})], 461773);
}}[""]), 134715, ({""(a) {
  "use strict";
  let b;
  b = a.i(993856);
  a.s(["f", 0, __mk180(b)]);
}}[""]), 932417, ({""(a) {
  "use strict";
  let b, c;
  b = a.i(993856);
  c = a.i(134715);
  a.s(["f", 0, __mk185(c, b)]);
}}[""]), 374458, ({""(b) {
  "use strict";
  let a;
  a: {
    a = b.i(993856);
    if (globalThis == null ? void 0 : globalThis.document) {
      a = a.useLayoutEffect;
      break a;
    }
    a = ({""() {
  "use strict";
}}[""]);
  }
  b.s(["f", 0, a]);
}}[""]), 760463, ({""(b) {
  "use strict";
  let a;
  a: {
    a = b.i(993856);
    if (globalThis == null ? void 0 : globalThis.document) {
      a = a.useLayoutEffect;
      break a;
    }
    a = ({""() {
  "use strict";
}}[""]);
  }
  b.s(["f", 0, a]);
}}[""]), 658312, ({""(a) {
  "use strict";
  let b, c;
  b = a.i(993856);
  c = a.i(540237);
  a.s(["f", 0, __mk194(c, ["x", "y", "top", "bottom", "left", "right", "width", "height"], {value: b})]);
}}[""]), 115441, ({""(a) {
  "use strict";
  let b;
  b = (0 , a.i(993856).createContext)(void 0);
  b.displayName = "DialogContext";
  a.s(["f", 0, b]);
}}[""]), 933091, ({""(a) {
  "use strict";
  let d, c, b;
  d = a.i(814996);
  c = a.i(993856);
  b = (0 , c.createContext)({forceShowTooltips: false, setForceShowTooltips: ({setForceShowTooltips() {
  "use strict";
}}.setForceShowTooltips)});
  b.displayName = "TooltipContext";
  a.s(["N", 0, b, "g", 0, __mk215(c, b, d)]);
}}[""])];
  j = ["object" == typeof document ? document.currentScript : void 0, k, 540237, ({""(c, b, d) {
  let a;
  a = (function r(g, j, k) {
  let h, b, i, a, c, d, e, f;
  h = null == j ? {value: 100} : {value: j};
  b = {value: void 0};
  i = {value: void 0};
  a = {value: void 0};
  c = {};
  d = {value: void 0};
  e = {value: void 0};
  f = __mk219(g, b, i, k, a, c, d, h, e);
  c.value = __mk220(g, b, i, k, a, c, d, h, e);
  f.clear = __mk221(a);
  f.flush = __mk222(g, b, a, d, e);
  return f;
});
  a.debounce = a;
  b.exports = a;
}}[""])];
  f.push(j);
})();
function main(a) {
  return a;
}
