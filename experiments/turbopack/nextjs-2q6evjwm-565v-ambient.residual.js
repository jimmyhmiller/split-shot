var __s0 = "Cannot destructure a null or undefined value";
var __s1 = "5305121a-8125-4aac-70ba-ae5e427f2eeb";

function __mk1(f, g) {
  "use strict";
  return function() {
    let b, c, a, h, d, e;
    const i = arguments;
    b = i.length;
    c = Array(b);
    a = 0;
    while (a < b) {
      c[a] = i[a];
      a += 1;
    }
    b = g.value.apply;
    a = f.value;
    h = g.value;
    c = (c[Symbol.iterator])();
    d = [];
    while (true) {
      e = c.next();
      if (e.done) {
        b = b.call(h, void 0, d);
        return a.call(f, b);
      }
      d.push(e.value);
    }
  };
}

function __mk2(l, h, m, t, n, i, o, p, j, q) {
  "use strict";
  return {a: (r) => {
    let b, g, d, c, e, f, s, k;
    b = m.value.reduce;
    g = m.value;
    d = (0 , t.value)();
    b = b.call(g, ({""(a, b) {
  "use strict";
  return b(a);
}}[""]), d);
    g = b.cacheSize;
    if (g < 1) {
      if (b == null) {
        throw new TypeError(__s0);
      }
      a: {
        d = b.prefix;
        c = b.experimentalParseClassName;
        if (d) {
          d = __mk4(h, {value: d + ":"}, __mk5(h), p);
          break a;
        }
        d = __mk5(h);
      }
      if (c) {
        d = __mk6({value: d}, c);
      }
      c = b.orderSensitiveModifiers;
      e = c.forEach;
      f = {value: new Map([])};
      e.call(c, __mk7(f));
      c = b.theme;
      e = b.classGroups;
      (0 , n.value)(e, c);
      c = b.conflictingClassGroups;
      g = ({get() {
  "use strict";
}}.get);
      e = ({set() {
  "use strict";
}}.set);
      g = {get: g, set: e};
      e = __mk10(f);
      f = __mk11();
      f = {cache: g, parseClassName: d, sortModifiers: e, getClassGroupId: f, getConflictingClassGroupIds: __mk12(c, b.conflictingClassGroupModifiers)};
      j.value = f;
      o.value = f.cache.get;
      q.value = j.value.cache.set;
      l.value = i;
      return i(r);
    }
    if (b == null) {
      throw new TypeError(__s0);
    }
    b: {
      d = b.prefix;
      c = b.experimentalParseClassName;
      if (d) {
        d = __mk4(h, {value: d + ":"}, __mk5(h), p);
        break b;
      }
      d = __mk5(h);
    }
    if (c) {
      d = __mk6({value: d}, c);
    }
    c = b.orderSensitiveModifiers;
    e = c.forEach;
    f = new Map([]);
    f = {value: f};
    e.call(c, __mk7(f));
    c = b.theme;
    e = b.classGroups;
    (0 , n.value)(e, c);
    c = b.conflictingClassGroups;
    b = b.conflictingClassGroupModifiers;
    e = {value: Object.create(null)};
    s = {value: 0};
    k = {value: Object.create(null)};
    g = __mk15(g, e, s, k);
    f = {cache: {get: __mk14(g, e, k), set: __mk16(g, e)}, parseClassName: d, sortModifiers: __mk10(f), getClassGroupId: __mk11(), getConflictingClassGroupIds: __mk12(c, b)};
    j.value = f;
    o.value = f.cache.get;
    q.value = j.value.cache.set;
    l.value = i;
    return i(r);
  }}.a;
}

function __mk4(d, c, e, f) {
  "use strict";
  return {t: (a) => {
    let b;
    a: {
      if (a.startsWith(c.value)) {
        b = e(a.slice(c.value.length));
        break a;
      }
      b = d(f, false, a, void 0, true);
    }
    return b;
  }}.t;
}

function __mk5(j) {
  "use strict";
  return {t: (g) => {
    let b, h, i, a, d, e, f, c;
    b = g.length;
    h = [];
    i = void 0;
    a = 0;
    d = 0;
    e = 0;
    f = 0;
    while (f < b) {
      a: {
        c = g[f];
        if (0 === a && 0 === d) {
          if (":" === c) {
            h.push;
            e = g.slice(e, f);
            h.push(e);
            e = f + 1;
            break a;
          }
          if ("/" === c) {
            i = f;
            break a;
          }
          if ("[" === c) {
            a += 1;
            break a;
          }
          if ("]" === c) {
            a -= 1;
            break a;
          }
          if ("(" === c) {
            d += 1;
            break a;
          }
          if (")" === c) {
            d -= 1;
            break a;
          }
          break a;
        }
        if ("[" === c) {
          a += 1;
          break a;
        }
        if ("]" === c) {
          a -= 1;
          break a;
        }
        if ("(" === c) {
          d += 1;
          break a;
        }
        if (")" === c) {
          d -= 1;
        }
      }
      f += 1;
    }
    b: {
      if (0 === h.length) {
        b = g;
        break b;
      }
      b = g.slice(e);
    }
    c: {
      if (b.endsWith("!")) {
        b = b.slice(0, -1);
        a = true;
        break c;
      }
      if (b.startsWith("!")) {
        b = b.slice(1);
        a = true;
        break c;
      }
      a = false;
    }
    return j(h, a, b, i && i > e ? i - e : void 0);
  }}.t;
}

function __mk6(a, b) {
  "use strict";
  return {t: (c) => {
    return b({className: c, parseClassName: a.value});
  }}.t;
}

function __mk7(a) {
  "use strict";
  return (b, c) => {
    a.value.set(b, 1000000 + c);
  };
}

function __mk10(j) {
  "use strict";
  return (i) => {
    let d, a, b, e, c, f, g, h;
    d = [];
    a = [];
    b = 0;
    while (b < i.length) {
      a: {
        e = i[b];
        c = "[" === e[0];
        f = j.value.has(e);
        if (c || f) {
          b: {
            if (a.length > 0) {
              a.sort();
              c = d.push;
              f = c.apply;
              a = (a[Symbol.iterator])();
              g = [];
              while (true) {
                h = a.next();
                if (h.done) {
                  f.call(c, d, g);
                  a = [];
                  break b;
                }
                g.push(h.value);
              }
            }
          }
          d.push(e);
          break a;
        }
        a.push(e);
      }
      b += 1;
    }
    c: {
      if (a.length > 0) {
        a.sort();
        b = d.push;
        e = b.apply;
        a = (a[Symbol.iterator])();
        c = [];
        while (true) {
          f = a.next();
          if (f.done) {
            e.call(b, d, c);
            break c;
          }
          c.push(f.value);
        }
      }
    }
    return d;
  };
}

function __mk11() {
  "use strict";
  return {getClassGroupId: (b) => {
    let a, c;
    a = b.startsWith("[");
    if (a) {
      a = b.endsWith("]");
    }
    if (a) {
      a: {
        if (-1 === b.slice(1, -1).indexOf(":")) {
          a = void 0;
          break a;
        }
        a = b.slice(1, -1);
        c = a.indexOf(":");
        a = a.slice(0, c);
        a = a ? "arbitrary.." + a : void 0;
      }
      return a;
    }
    a = b.split("-");
    c = ("" === a[0] && a.length > 1) - 0;
    return t(a, c, r);
  }}.getClassGroupId;
}

function __mk12(f, g) {
  "use strict";
  return {getConflictingClassGroupIds: (e, h) => {
    let c, b, d, a;
    if (h) {
      c = g[e];
      b = f[e];
      if (c) {
        if (b) {
          d = Array(b.length + c.length);
          a = 0;
          while (a < b.length) {
            d[a] = b[a];
            a += 1;
          }
          a = 0;
          while (a < c.length) {
            d[b.length + a] = c[a];
            a += 1;
          }
          return d;
        }
        return c;
      }
      return b || o;
    }
    return f[e] || o;
  }}.getConflictingClassGroupIds;
}

function __mk14(c, d, e) {
  "use strict";
  return {get(b) {
    let a;
    a: {
      a = d.value[b];
      if (void 0 !== a) {
        break a;
      }
      b: {
        a = e.value[b];
        if (void 0 !== a) {
          c(b, a);
          break b;
        }
        a = void 0;
      }
    }
    return a;
  }}.get;
}

function __mk15(d, a, b, e) {
  "use strict";
  return {l: (f, g) => {
    let c;
    a.value[f] = g;
    c = b.value; ++c;
    b.value = c;
    if (c > d) {
      b.value = 0;
      e.value = a.value;
      a.value = Object.create(null);
    }
  }}.l;
}

function __mk16(d, b) {
  "use strict";
  return {set(a, c) {
    a: {
      if (a in b.value) {
        b.value[a] = c;
        break a;
      }
      d(a, c);
    }
  }}.set;
}

function __mk18(o, e0, H, j, e1, e2, s, n, b, a, i, d, f, e3, g, h, I, k, J, e4, t, e5, e6, l, e7) {
  "use strict";
  return () => {
    let e, q, u, v, w, x, y, p, c, m, z, A, B, C, r, D, E, F, G, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z, aa, ab, ac, ad, ae, af, ag, ah, ai, aj, ak, al, am, an, ao, ap, aq, ar, as, at, au, av, aw, ax, ay, az, aA, aB, aC, aD, aE, aF, aG, aH, aI, aJ, aK, aL, aM, aN, aO, aP, aQ, aR, aS, aT, aU, aV, aW, aX, aY, aZ, a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, ba, bb, bc, bd, be, bf, bg, bh, bi, bj, bk, bl, bm, bn, bo, bp, bq, br, bs, bt, bu, bv, bw, bx, by, bz, bA, bB, bC, bD, bE, bF, bG, bH, bI, bJ, bK, bL, bM, bN, bO, bP, bQ, bR, bS, bT, bU, bV, bW, bX, bY, bZ, b0, b1, b2, b3, b4, b5, b6, b7, b8, b9, ca, cb, cc, cd, ce, cf, cg, ch, ci, cj, ck, cl, cm, cn, co, cp, cq, cr, cs, ct, cu, cv, cw, cx, cy, cz, cA, cB, cC, cD, cE, cF, cG, cH, cI, cJ, cK, cL, cM, cN, cO, cP, cQ, cR, cS, cT, cU, cV, cW, cX, cY, cZ, c0, c1, c2, c3, c4, c5, c6, c7, c8, c9, da, db, dc, dd, de, df, dg, dh, di, dj, dk, dl, dm, dn, dp, dq, dr, ds, dt, du, dv, dw, dx, dy, dz, dA, dB, dC, dD, dE, dF, dG, dH, dI, dJ, dK, dL, dM, dN, dO, dP, dQ, dR, dS, dT, dU, dV, dW, dX, dY, dZ, d0, d1, d2, d3, d4, d5, d6, d7, d8, d9, ea, eb, ec, ed, ee, ef, eg, eh, ei, ej, ek, el, em, en, eo, ep, eq, er, es, et, eu, ev, ew, ex, ey, ez, eA, eB, eC, eD, eE, eF, eG, eH, eI, eJ, eK, eL, eM, eN, eO, eP, eQ, eR, eS, eT, eU, eV, eW, eX, eY, eZ;
    e = l("color");
    q = l("font");
    u = l("text");
    v = l("font-weight");
    w = l("tracking");
    x = l("leading");
    y = l("breakpoint");
    p = l("container");
    c = l("spacing");
    m = l("radius");
    z = l("shadow");
    A = l("inset-shadow");
    B = l("text-shadow");
    C = l("drop-shadow");
    r = l("blur");
    D = l("perspective");
    E = l("aspect");
    F = l("ease");
    G = l("animate");
    K = {animate: ["spin", "ping", "pulse", "bounce"], aspect: ["video"], blur: [o], breakpoint: [o], color: [e0], container: [o], "drop-shadow": [o], ease: ["in", "out", "in-out"], font: [e7], "font-weight": ["thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black"], "inset-shadow": [o], leading: ["none", "tight", "snug", "normal", "relaxed", "loose"], perspective: ["dramatic", "near", "normal", "midrange", "distant", "none"], radius: [o], shadow: [o], spacing: ["px", d], text: [o], "text-shadow": [o], tracking: ["tighter", "tight", "normal", "wide", "wider", "widest"]};
    E = [{aspect: ["auto", "square", f, a.value, b.value, E]}];
    L = ["container"];
    M = [{columns: [d, a.value, b.value, p]}];
    N = [{"break-after": ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"]}];
    O = [{"break-before": ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"]}];
    P = [{"break-inside": ["auto", "avoid", "avoid-page", "avoid-column"]}];
    Q = [{"box-decoration": ["slice", "clone"]}];
    R = [{box: ["border", "content"]}];
    S = ["block", "inline-block", "inline", "flex", "inline-flex", "table", "inline-table", "table-caption", "table-cell", "table-column", "table-column-group", "table-footer-group", "table-header-group", "table-row-group", "table-row", "flow-root", "grid", "inline-grid", "contents", "list-item", "hidden"];
    T = ["sr-only", "not-sr-only"];
    U = [{float: ["right", "left", "none", "start", "end"]}];
    V = [{clear: ["left", "right", "both", "none", "start", "end"]}];
    W = ["isolate", "isolation-auto"];
    X = [{object: ["contain", "cover", "fill", "none", "scale-down"]}];
    Y = [{object: ["center", "top", "bottom", "left", "right", "top-left", "left-top", "top-right", "right-top", "bottom-right", "right-bottom", "bottom-left", "left-bottom", b.value, a.value]}];
    Z = [{overflow: ["auto", "hidden", "clip", "visible", "scroll"]}];
    aa = [{"overflow-x": ["auto", "hidden", "clip", "visible", "scroll"]}];
    ab = [{"overflow-y": ["auto", "hidden", "clip", "visible", "scroll"]}];
    ac = [{overscroll: ["auto", "contain", "none"]}];
    ad = [{"overscroll-x": ["auto", "contain", "none"]}];
    ae = [{"overscroll-y": ["auto", "contain", "none"]}];
    af = ["static", "fixed", "absolute", "relative", "sticky"];
    ag = [{inset: [f, "full", "auto", b.value, a.value, c]}];
    ah = [{"inset-x": [f, "full", "auto", b.value, a.value, c]}];
    ai = [{"inset-y": [f, "full", "auto", b.value, a.value, c]}];
    aj = [{"inset-s": [f, "full", "auto", b.value, a.value, c], start: [f, "full", "auto", b.value, a.value, c]}];
    ak = [{"inset-e": [f, "full", "auto", b.value, a.value, c], end: [f, "full", "auto", b.value, a.value, c]}];
    al = [{"inset-bs": [f, "full", "auto", b.value, a.value, c]}];
    am = [{"inset-be": [f, "full", "auto", b.value, a.value, c]}];
    an = [{top: [f, "full", "auto", b.value, a.value, c]}];
    ao = [{right: [f, "full", "auto", b.value, a.value, c]}];
    ap = [{bottom: [f, "full", "auto", b.value, a.value, c]}];
    aq = [{left: [f, "full", "auto", b.value, a.value, c]}];
    ar = ["visible", "invisible", "collapse"];
    as = [{z: [n, "auto", b.value, a.value]}];
    at = [{basis: [f, "full", "auto", p, b.value, a.value, c]}];
    au = [{flex: ["row", "row-reverse", "col", "col-reverse"]}];
    av = [{flex: ["nowrap", "wrap", "wrap-reverse"]}];
    aw = [{flex: [d, f, "auto", "initial", "none", a.value]}];
    ax = [{grow: ["", d, b.value, a.value]}];
    ay = [{shrink: ["", d, b.value, a.value]}];
    az = [{order: [n, "first", "last", "none", b.value, a.value]}];
    aA = [{"grid-cols": [n, "none", "subgrid", b.value, a.value]}];
    aB = [{col: ["auto", {span: ["full", n, b.value, a.value]}, n, b.value, a.value]}];
    aC = [{"col-start": [n, "auto", b.value, a.value]}];
    aD = [{"col-end": [n, "auto", b.value, a.value]}];
    aE = [{"grid-rows": [n, "none", "subgrid", b.value, a.value]}];
    aF = [{row: ["auto", {span: ["full", n, b.value, a.value]}, n, b.value, a.value]}];
    aG = [{"row-start": [n, "auto", b.value, a.value]}];
    aH = [{"row-end": [n, "auto", b.value, a.value]}];
    aI = [{"grid-flow": ["row", "col", "dense", "row-dense", "col-dense"]}];
    aJ = [{"auto-cols": ["auto", "min", "max", "fr", b.value, a.value]}];
    aK = [{"auto-rows": ["auto", "min", "max", "fr", b.value, a.value]}];
    aL = [{gap: [b.value, a.value, c]}];
    aM = [{"gap-x": [b.value, a.value, c]}];
    aN = [{"gap-y": [b.value, a.value, c]}];
    aO = [{justify: ["start", "end", "center", "between", "around", "evenly", "stretch", "baseline", "center-safe", "end-safe", "normal"]}];
    aP = [{"justify-items": ["start", "end", "center", "stretch", "center-safe", "end-safe", "normal"]}];
    aQ = [{"justify-self": ["auto", "start", "end", "center", "stretch", "center-safe", "end-safe"]}];
    aR = [{content: ["normal", "start", "end", "center", "between", "around", "evenly", "stretch", "baseline", "center-safe", "end-safe"]}];
    aS = [{items: ["start", "end", "center", "stretch", "center-safe", "end-safe", {baseline: ["", "last"]}]}];
    aT = [{self: ["auto", "start", "end", "center", "stretch", "center-safe", "end-safe", {baseline: ["", "last"]}]}];
    aU = [{"place-content": ["start", "end", "center", "between", "around", "evenly", "stretch", "baseline", "center-safe", "end-safe"]}];
    aV = [{"place-items": ["start", "end", "center", "stretch", "center-safe", "end-safe", "baseline"]}];
    aW = [{"place-self": ["auto", "start", "end", "center", "stretch", "center-safe", "end-safe"]}];
    aX = [{p: [b.value, a.value, c]}];
    aY = [{px: [b.value, a.value, c]}];
    aZ = [{py: [b.value, a.value, c]}];
    a0 = [{ps: [b.value, a.value, c]}];
    a1 = [{pe: [b.value, a.value, c]}];
    a2 = [{pbs: [b.value, a.value, c]}];
    a3 = [{pbe: [b.value, a.value, c]}];
    a4 = [{pt: [b.value, a.value, c]}];
    a5 = [{pr: [b.value, a.value, c]}];
    a6 = [{pb: [b.value, a.value, c]}];
    a7 = [{pl: [b.value, a.value, c]}];
    a8 = [{m: ["auto", b.value, a.value, c]}];
    a9 = [{mx: ["auto", b.value, a.value, c]}];
    ba = [{my: ["auto", b.value, a.value, c]}];
    bb = [{ms: ["auto", b.value, a.value, c]}];
    bc = [{me: ["auto", b.value, a.value, c]}];
    bd = [{mbs: ["auto", b.value, a.value, c]}];
    be = [{mbe: ["auto", b.value, a.value, c]}];
    bf = [{mt: ["auto", b.value, a.value, c]}];
    bg = [{mr: ["auto", b.value, a.value, c]}];
    bh = [{mb: ["auto", b.value, a.value, c]}];
    bi = [{ml: ["auto", b.value, a.value, c]}];
    bj = [{"space-x": [b.value, a.value, c]}];
    bk = ["space-x-reverse"];
    bl = [{"space-y": [b.value, a.value, c]}];
    bm = ["space-y-reverse"];
    bn = [{size: [f, "auto", "full", "dvw", "dvh", "lvw", "lvh", "svw", "svh", "min", "max", "fit", b.value, a.value, c]}];
    bo = [{inline: ["auto", f, "screen", "full", "dvw", "lvw", "svw", "min", "max", "fit", b.value, a.value, c]}];
    bp = [{"min-inline": ["auto", f, "screen", "full", "dvw", "lvw", "svw", "min", "max", "fit", b.value, a.value, c]}];
    bq = [{"max-inline": ["none", f, "screen", "full", "dvw", "lvw", "svw", "min", "max", "fit", b.value, a.value, c]}];
    br = [{block: ["auto", f, "screen", "full", "lh", "dvh", "lvh", "svh", "min", "max", "fit", b.value, a.value, c]}];
    bs = [{"min-block": ["auto", f, "screen", "full", "lh", "dvh", "lvh", "svh", "min", "max", "fit", b.value, a.value, c]}];
    bt = [{"max-block": ["none", f, "screen", "full", "lh", "dvh", "lvh", "svh", "min", "max", "fit", b.value, a.value, c]}];
    bu = [{w: [p, "screen", f, "auto", "full", "dvw", "dvh", "lvw", "lvh", "svw", "svh", "min", "max", "fit", b.value, a.value, c]}];
    bv = [{"min-w": [p, "screen", "none", f, "auto", "full", "dvw", "dvh", "lvw", "lvh", "svw", "svh", "min", "max", "fit", b.value, a.value, c]}];
    y = [{"max-w": [p, "screen", "none", "prose", {screen: [y]}, f, "auto", "full", "dvw", "dvh", "lvw", "lvh", "svw", "svh", "min", "max", "fit", b.value, a.value, c]}];
    p = [{h: ["screen", "lh", f, "auto", "full", "dvw", "dvh", "lvw", "lvh", "svw", "svh", "min", "max", "fit", b.value, a.value, c]}];
    bw = [{"min-h": ["screen", "lh", "none", f, "auto", "full", "dvw", "dvh", "lvw", "lvh", "svw", "svh", "min", "max", "fit", b.value, a.value, c]}];
    bx = [{"max-h": ["screen", "lh", f, "auto", "full", "dvw", "dvh", "lvw", "lvh", "svw", "svh", "min", "max", "fit", b.value, a.value, c]}];
    u = [{text: ["base", u, i, g]}];
    by = ["antialiased", "subpixel-antialiased"];
    bz = ["italic", "not-italic"];
    v = [{font: [v, e6, e5]}];
    bA = [{"font-stretch": ["ultra-condensed", "extra-condensed", "condensed", "semi-condensed", "normal", "semi-expanded", "expanded", "extra-expanded", "ultra-expanded", h, a.value]}];
    q = [{font: [e3, e1, q]}];
    bB = [{"font-features": [a.value]}];
    bC = ["normal-nums"];
    bD = ["ordinal"];
    bE = ["slashed-zero"];
    bF = ["lining-nums", "oldstyle-nums"];
    bG = ["proportional-nums", "tabular-nums"];
    bH = ["diagonal-fractions", "stacked-fractions"];
    w = [{tracking: [w, b.value, a.value]}];
    bI = [{"line-clamp": [d, "none", b.value, I]}];
    x = [{leading: [x, b.value, a.value, c]}];
    bJ = [{"list-image": ["none", b.value, a.value]}];
    bK = [{list: ["inside", "outside"]}];
    bL = [{list: ["disc", "decimal", "none", b.value, a.value]}];
    bM = [{text: ["left", "center", "right", "justify", "start", "end"]}];
    bN = [{placeholder: [e, b.value, a.value]}];
    bO = [{text: [e, b.value, a.value]}];
    bP = ["underline", "overline", "line-through", "no-underline"];
    bQ = [{decoration: ["solid", "dashed", "dotted", "double", "wavy"]}];
    bR = [{decoration: [d, "from-font", "auto", b.value, g]}];
    bS = [{decoration: [e, b.value, a.value]}];
    bT = [{"underline-offset": [d, "auto", b.value, a.value]}];
    bU = ["uppercase", "lowercase", "capitalize", "normal-case"];
    bV = ["truncate", "text-ellipsis", "text-clip"];
    bW = [{text: ["wrap", "nowrap", "balance", "pretty"]}];
    bX = [{indent: [b.value, a.value, c]}];
    bY = [{align: ["baseline", "top", "middle", "bottom", "text-top", "text-bottom", "sub", "super", b.value, a.value]}];
    bZ = [{whitespace: ["normal", "nowrap", "pre", "pre-line", "pre-wrap", "break-spaces"]}];
    b0 = [{break: ["normal", "words", "all", "keep"]}];
    b1 = [{wrap: ["break-word", "anywhere", "normal"]}];
    b2 = [{hyphens: ["none", "manual", "auto"]}];
    b3 = [{content: ["none", b.value, a.value]}];
    b4 = [{bg: ["fixed", "local", "scroll"]}];
    b5 = [{"bg-clip": ["border", "padding", "content", "text"]}];
    b6 = [{"bg-origin": ["border", "padding", "content"]}];
    b7 = [{bg: ["center", "top", "bottom", "left", "right", "top-left", "left-top", "top-right", "right-top", "bottom-right", "right-bottom", "bottom-left", "left-bottom", k, j, {position: [b.value, a.value]}]}];
    b8 = [{bg: ["no-repeat", {repeat: ["", "x", "y", "space", "round"]}]}];
    b9 = [{bg: ["auto", "cover", "contain", J, H, {size: [b.value, a.value]}]}];
    ca = [{bg: ["none", {linear: [{to: ["t", "tr", "r", "br", "b", "bl", "l", "tl"]}, n, b.value, a.value], radial: ["", b.value, a.value], conic: [n, b.value, a.value]}, e4, e2]}];
    cb = [{bg: [e, b.value, a.value]}];
    cc = [{from: [h, i, g]}];
    cd = [{via: [h, i, g]}];
    ce = [{to: [h, i, g]}];
    cf = [{from: [e, b.value, a.value]}];
    cg = [{via: [e, b.value, a.value]}];
    ch = [{to: [e, b.value, a.value]}];
    ci = [{rounded: ["", "none", "full", m, b.value, a.value]}];
    cj = [{"rounded-s": ["", "none", "full", m, b.value, a.value]}];
    ck = [{"rounded-e": ["", "none", "full", m, b.value, a.value]}];
    cl = [{"rounded-t": ["", "none", "full", m, b.value, a.value]}];
    cm = [{"rounded-r": ["", "none", "full", m, b.value, a.value]}];
    cn = [{"rounded-b": ["", "none", "full", m, b.value, a.value]}];
    co = [{"rounded-l": ["", "none", "full", m, b.value, a.value]}];
    cp = [{"rounded-ss": ["", "none", "full", m, b.value, a.value]}];
    cq = [{"rounded-se": ["", "none", "full", m, b.value, a.value]}];
    cr = [{"rounded-ee": ["", "none", "full", m, b.value, a.value]}];
    cs = [{"rounded-es": ["", "none", "full", m, b.value, a.value]}];
    ct = [{"rounded-tl": ["", "none", "full", m, b.value, a.value]}];
    cu = [{"rounded-tr": ["", "none", "full", m, b.value, a.value]}];
    cv = [{"rounded-br": ["", "none", "full", m, b.value, a.value]}];
    m = [{"rounded-bl": ["", "none", "full", m, b.value, a.value]}];
    cw = [{border: ["", d, i, g]}];
    cx = [{"border-x": ["", d, i, g]}];
    cy = [{"border-y": ["", d, i, g]}];
    cz = [{"border-s": ["", d, i, g]}];
    cA = [{"border-e": ["", d, i, g]}];
    cB = [{"border-bs": ["", d, i, g]}];
    cC = [{"border-be": ["", d, i, g]}];
    cD = [{"border-t": ["", d, i, g]}];
    cE = [{"border-r": ["", d, i, g]}];
    cF = [{"border-b": ["", d, i, g]}];
    cG = [{"border-l": ["", d, i, g]}];
    cH = [{"divide-x": ["", d, i, g]}];
    cI = ["divide-x-reverse"];
    cJ = [{"divide-y": ["", d, i, g]}];
    cK = ["divide-y-reverse"];
    cL = [{border: ["solid", "dashed", "dotted", "double", "hidden", "none"]}];
    cM = [{divide: ["solid", "dashed", "dotted", "double", "hidden", "none"]}];
    cN = [{border: [e, b.value, a.value]}];
    cO = [{"border-x": [e, b.value, a.value]}];
    cP = [{"border-y": [e, b.value, a.value]}];
    cQ = [{"border-s": [e, b.value, a.value]}];
    cR = [{"border-e": [e, b.value, a.value]}];
    cS = [{"border-bs": [e, b.value, a.value]}];
    cT = [{"border-be": [e, b.value, a.value]}];
    cU = [{"border-t": [e, b.value, a.value]}];
    cV = [{"border-r": [e, b.value, a.value]}];
    cW = [{"border-b": [e, b.value, a.value]}];
    cX = [{"border-l": [e, b.value, a.value]}];
    cY = [{divide: [e, b.value, a.value]}];
    cZ = [{outline: ["solid", "dashed", "dotted", "double", "none", "hidden"]}];
    c0 = [{"outline-offset": [d, b.value, a.value]}];
    c1 = [{outline: ["", d, i, g]}];
    c2 = [{outline: [e, b.value, a.value]}];
    z = [{shadow: ["", "none", z, t, s]}];
    c3 = [{shadow: [e, b.value, a.value]}];
    A = [{"inset-shadow": ["none", A, t, s]}];
    c4 = [{"inset-shadow": [e, b.value, a.value]}];
    c5 = [{ring: ["", d, i, g]}];
    c6 = ["ring-inset"];
    c7 = [{ring: [e, b.value, a.value]}];
    c8 = [{"ring-offset": [d, g]}];
    c9 = [{"ring-offset": [e, b.value, a.value]}];
    da = [{"inset-ring": ["", d, i, g]}];
    db = [{"inset-ring": [e, b.value, a.value]}];
    B = [{"text-shadow": ["none", B, t, s]}];
    dc = [{"text-shadow": [e, b.value, a.value]}];
    dd = [{opacity: [d, b.value, a.value]}];
    de = [{"mix-blend": ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity", "plus-darker", "plus-lighter"]}];
    df = [{"bg-blend": ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"]}];
    dg = [{"mask-clip": ["border", "padding", "content", "fill", "stroke", "view"]}, "mask-no-clip"];
    dh = [{mask: ["add", "subtract", "intersect", "exclude"]}];
    di = [{"mask-linear": [d]}];
    dj = [{"mask-linear-from": [d, h, k, j]}];
    dk = [{"mask-linear-to": [d, h, k, j]}];
    dl = [{"mask-linear-from": [e, b.value, a.value]}];
    dm = [{"mask-linear-to": [e, b.value, a.value]}];
    dn = [{"mask-t-from": [d, h, k, j]}];
    dp = [{"mask-t-to": [d, h, k, j]}];
    dq = [{"mask-t-from": [e, b.value, a.value]}];
    dr = [{"mask-t-to": [e, b.value, a.value]}];
    ds = [{"mask-r-from": [d, h, k, j]}];
    dt = [{"mask-r-to": [d, h, k, j]}];
    du = [{"mask-r-from": [e, b.value, a.value]}];
    dv = [{"mask-r-to": [e, b.value, a.value]}];
    dw = [{"mask-b-from": [d, h, k, j]}];
    dx = [{"mask-b-to": [d, h, k, j]}];
    dy = [{"mask-b-from": [e, b.value, a.value]}];
    dz = [{"mask-b-to": [e, b.value, a.value]}];
    dA = [{"mask-l-from": [d, h, k, j]}];
    dB = [{"mask-l-to": [d, h, k, j]}];
    dC = [{"mask-l-from": [e, b.value, a.value]}];
    dD = [{"mask-l-to": [e, b.value, a.value]}];
    dE = [{"mask-x-from": [d, h, k, j]}];
    dF = [{"mask-x-to": [d, h, k, j]}];
    dG = [{"mask-x-from": [e, b.value, a.value]}];
    dH = [{"mask-x-to": [e, b.value, a.value]}];
    dI = [{"mask-y-from": [d, h, k, j]}];
    dJ = [{"mask-y-to": [d, h, k, j]}];
    dK = [{"mask-y-from": [e, b.value, a.value]}];
    dL = [{"mask-y-to": [e, b.value, a.value]}];
    dM = [{"mask-radial": [b.value, a.value]}];
    dN = [{"mask-radial-from": [d, h, k, j]}];
    dO = [{"mask-radial-to": [d, h, k, j]}];
    dP = [{"mask-radial-from": [e, b.value, a.value]}];
    dQ = [{"mask-radial-to": [e, b.value, a.value]}];
    dR = [{"mask-radial": ["circle", "ellipse"]}];
    dS = [{"mask-radial": [{closest: ["side", "corner"], farthest: ["side", "corner"]}]}];
    dT = [{"mask-radial-at": ["center", "top", "bottom", "left", "right", "top-left", "left-top", "top-right", "right-top", "bottom-right", "right-bottom", "bottom-left", "left-bottom"]}];
    dU = [{"mask-conic": [d]}];
    dV = [{"mask-conic-from": [d, h, k, j]}];
    dW = [{"mask-conic-to": [d, h, k, j]}];
    dX = [{"mask-conic-from": [e, b.value, a.value]}];
    dY = [{"mask-conic-to": [e, b.value, a.value]}];
    dZ = [{mask: ["alpha", "luminance", "match"]}];
    d0 = [{"mask-origin": ["border", "padding", "content", "fill", "stroke", "view"]}];
    d1 = [{mask: ["center", "top", "bottom", "left", "right", "top-left", "left-top", "top-right", "right-top", "bottom-right", "right-bottom", "bottom-left", "left-bottom", k, j, {position: [b.value, a.value]}]}];
    d2 = [{mask: ["no-repeat", {repeat: ["", "x", "y", "space", "round"]}]}];
    d3 = [{mask: ["auto", "cover", "contain", J, H, {size: [b.value, a.value]}]}];
    d4 = [{"mask-type": ["alpha", "luminance"]}];
    d5 = [{mask: ["none", b.value, a.value]}];
    d6 = [{filter: ["", "none", b.value, a.value]}];
    d7 = [{blur: ["", "none", r, b.value, a.value]}];
    d8 = [{brightness: [d, b.value, a.value]}];
    d9 = [{contrast: [d, b.value, a.value]}];
    C = [{"drop-shadow": ["", "none", C, t, s]}];
    ea = [{"drop-shadow": [e, b.value, a.value]}];
    eb = [{grayscale: ["", d, b.value, a.value]}];
    ec = [{"hue-rotate": [d, b.value, a.value]}];
    ed = [{invert: ["", d, b.value, a.value]}];
    ee = [{saturate: [d, b.value, a.value]}];
    ef = [{sepia: ["", d, b.value, a.value]}];
    eg = [{"backdrop-filter": ["", "none", b.value, a.value]}];
    r = [{"backdrop-blur": ["", "none", r, b.value, a.value]}];
    eh = [{"backdrop-brightness": [d, b.value, a.value]}];
    ei = [{"backdrop-contrast": [d, b.value, a.value]}];
    ej = [{"backdrop-grayscale": ["", d, b.value, a.value]}];
    ek = [{"backdrop-hue-rotate": [d, b.value, a.value]}];
    el = [{"backdrop-invert": ["", d, b.value, a.value]}];
    em = [{"backdrop-opacity": [d, b.value, a.value]}];
    en = [{"backdrop-saturate": [d, b.value, a.value]}];
    eo = [{"backdrop-sepia": ["", d, b.value, a.value]}];
    ep = [{border: ["collapse", "separate"]}];
    eq = [{"border-spacing": [b.value, a.value, c]}];
    er = [{"border-spacing-x": [b.value, a.value, c]}];
    es = [{"border-spacing-y": [b.value, a.value, c]}];
    et = [{table: ["auto", "fixed"]}];
    eu = [{caption: ["top", "bottom"]}];
    ev = [{transition: ["", "all", "colors", "opacity", "shadow", "transform", "none", b.value, a.value]}];
    ew = [{transition: ["normal", "discrete"]}];
    ex = [{duration: [d, "initial", b.value, a.value]}];
    F = [{ease: ["linear", "initial", F, b.value, a.value]}];
    ey = [{delay: [d, b.value, a.value]}];
    G = [{animate: ["none", G, b.value, a.value]}];
    ez = [{backface: ["hidden", "visible"]}];
    D = [{perspective: [D, b.value, a.value]}];
    eA = [{"perspective-origin": ["center", "top", "bottom", "left", "right", "top-left", "left-top", "top-right", "right-top", "bottom-right", "right-bottom", "bottom-left", "left-bottom", b.value, a.value]}];
    eB = [{rotate: ["none", d, b.value, a.value]}];
    eC = [{"rotate-x": ["none", d, b.value, a.value]}];
    eD = [{"rotate-y": ["none", d, b.value, a.value]}];
    eE = [{"rotate-z": ["none", d, b.value, a.value]}];
    eF = [{scale: ["none", d, b.value, a.value]}];
    eG = [{"scale-x": ["none", d, b.value, a.value]}];
    eH = [{"scale-y": ["none", d, b.value, a.value]}];
    eI = [{"scale-z": ["none", d, b.value, a.value]}];
    eJ = ["scale-3d"];
    eK = [{skew: [d, b.value, a.value]}];
    eL = [{"skew-x": [d, b.value, a.value]}];
    eM = [{"skew-y": [d, b.value, a.value]}];
    eN = [{transform: [b.value, a.value, "", "none", "gpu", "cpu"]}];
    eO = [{origin: ["center", "top", "bottom", "left", "right", "top-left", "left-top", "top-right", "right-top", "bottom-right", "right-bottom", "bottom-left", "left-bottom", b.value, a.value]}];
    eP = [{transform: ["3d", "flat"]}];
    eQ = [{translate: [f, "full", b.value, a.value, c]}];
    eR = [{"translate-x": [f, "full", b.value, a.value, c]}];
    eS = [{"translate-y": [f, "full", b.value, a.value, c]}];
    eT = [{"translate-z": [f, "full", b.value, a.value, c]}];
    eU = ["translate-none"];
    eV = [{accent: [e, b.value, a.value]}];
    eW = [{appearance: ["none", "auto"]}];
    eX = [{caret: [e, b.value, a.value]}];
    eY = [{scheme: ["normal", "dark", "light", "light-dark", "only-dark", "only-light"]}];
    eZ = ["auto", "default", "pointer", "wait", "text", "move", "help", "not-allowed", "none", "context-menu", "progress", "cell", "crosshair", "vertical-text", "alias", "copy", "no-drop", "grab", "grabbing", "all-scroll", "col-resize", "row-resize", "n-resize", "e-resize", "s-resize", "w-resize", "ne-resize", "nw-resize", "se-resize", "sw-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize", "zoom-in", "zoom-out", b.value, a.value];
    e = {aspect: E, container: L, columns: M, "break-after": N, "break-before": O, "break-inside": P, "box-decoration": Q, box: R, display: S, sr: T, float: U, clear: V, isolation: W, "object-fit": X, "object-position": Y, overflow: Z, "overflow-x": aa, "overflow-y": ab, overscroll: ac, "overscroll-x": ad, "overscroll-y": ae, position: af, inset: ag, "inset-x": ah, "inset-y": ai, start: aj, end: ak, "inset-bs": al, "inset-be": am, top: an, right: ao, bottom: ap, left: aq, visibility: ar, z: as, basis: at, "flex-direction": au, "flex-wrap": av, flex: aw, grow: ax, shrink: ay, order: az, "grid-cols": aA, "col-start-end": aB, "col-start": aC, "col-end": aD, "grid-rows": aE, "row-start-end": aF, "row-start": aG, "row-end": aH, "grid-flow": aI, "auto-cols": aJ, "auto-rows": aK, gap: aL, "gap-x": aM, "gap-y": aN, "justify-content": aO, "justify-items": aP, "justify-self": aQ, "align-content": aR, "align-items": aS, "align-self": aT, "place-content": aU, "place-items": aV, "place-self": aW, p: aX, px: aY, py: aZ, ps: a0, pe: a1, pbs: a2, pbe: a3, pt: a4, pr: a5, pb: a6, pl: a7, m: a8, mx: a9, my: ba, ms: bb, me: bc, mbs: bd, mbe: be, mt: bf, mr: bg, mb: bh, ml: bi, "space-x": bj, "space-x-reverse": bk, "space-y": bl, "space-y-reverse": bm, size: bn, "inline-size": bo, "min-inline-size": bp, "max-inline-size": bq, "block-size": br, "min-block-size": bs, "max-block-size": bt, w: bu, "min-w": bv, "max-w": y, h: p, "min-h": bw, "max-h": bx, "font-size": u, "font-smoothing": by, "font-style": bz, "font-weight": v, "font-stretch": bA, "font-family": q, "font-features": bB, "fvn-normal": bC, "fvn-ordinal": bD, "fvn-slashed-zero": bE, "fvn-figure": bF, "fvn-spacing": bG, "fvn-fraction": bH, tracking: w, "line-clamp": bI, leading: x, "list-image": bJ, "list-style-position": bK, "list-style-type": bL, "text-alignment": bM, "placeholder-color": bN, "text-color": bO, "text-decoration": bP, "text-decoration-style": bQ, "text-decoration-thickness": bR, "text-decoration-color": bS, "underline-offset": bT, "text-transform": bU, "text-overflow": bV, "text-wrap": bW, indent: bX, "vertical-align": bY, whitespace: bZ, break: b0, wrap: b1, hyphens: b2, content: b3, "bg-attachment": b4, "bg-clip": b5, "bg-origin": b6, "bg-position": b7, "bg-repeat": b8, "bg-size": b9, "bg-image": ca, "bg-color": cb, "gradient-from-pos": cc, "gradient-via-pos": cd, "gradient-to-pos": ce, "gradient-from": cf, "gradient-via": cg, "gradient-to": ch, rounded: ci, "rounded-s": cj, "rounded-e": ck, "rounded-t": cl, "rounded-r": cm, "rounded-b": cn, "rounded-l": co, "rounded-ss": cp, "rounded-se": cq, "rounded-ee": cr, "rounded-es": cs, "rounded-tl": ct, "rounded-tr": cu, "rounded-br": cv, "rounded-bl": m, "border-w": cw, "border-w-x": cx, "border-w-y": cy, "border-w-s": cz, "border-w-e": cA, "border-w-bs": cB, "border-w-be": cC, "border-w-t": cD, "border-w-r": cE, "border-w-b": cF, "border-w-l": cG, "divide-x": cH, "divide-x-reverse": cI, "divide-y": cJ, "divide-y-reverse": cK, "border-style": cL, "divide-style": cM, "border-color": cN, "border-color-x": cO, "border-color-y": cP, "border-color-s": cQ, "border-color-e": cR, "border-color-bs": cS, "border-color-be": cT, "border-color-t": cU, "border-color-r": cV, "border-color-b": cW, "border-color-l": cX, "divide-color": cY, "outline-style": cZ, "outline-offset": c0, "outline-w": c1, "outline-color": c2, shadow: z, "shadow-color": c3, "inset-shadow": A, "inset-shadow-color": c4, "ring-w": c5, "ring-w-inset": c6, "ring-color": c7, "ring-offset-w": c8, "ring-offset-color": c9, "inset-ring-w": da, "inset-ring-color": db, "text-shadow": B, "text-shadow-color": dc, opacity: dd, "mix-blend": de, "bg-blend": df, "mask-clip": dg, "mask-composite": dh, "mask-image-linear-pos": di, "mask-image-linear-from-pos": dj, "mask-image-linear-to-pos": dk, "mask-image-linear-from-color": dl, "mask-image-linear-to-color": dm, "mask-image-t-from-pos": dn, "mask-image-t-to-pos": dp, "mask-image-t-from-color": dq, "mask-image-t-to-color": dr, "mask-image-r-from-pos": ds, "mask-image-r-to-pos": dt, "mask-image-r-from-color": du, "mask-image-r-to-color": dv, "mask-image-b-from-pos": dw, "mask-image-b-to-pos": dx, "mask-image-b-from-color": dy, "mask-image-b-to-color": dz, "mask-image-l-from-pos": dA, "mask-image-l-to-pos": dB, "mask-image-l-from-color": dC, "mask-image-l-to-color": dD, "mask-image-x-from-pos": dE, "mask-image-x-to-pos": dF, "mask-image-x-from-color": dG, "mask-image-x-to-color": dH, "mask-image-y-from-pos": dI, "mask-image-y-to-pos": dJ, "mask-image-y-from-color": dK, "mask-image-y-to-color": dL, "mask-image-radial": dM, "mask-image-radial-from-pos": dN, "mask-image-radial-to-pos": dO, "mask-image-radial-from-color": dP, "mask-image-radial-to-color": dQ, "mask-image-radial-shape": dR, "mask-image-radial-size": dS, "mask-image-radial-pos": dT, "mask-image-conic-pos": dU, "mask-image-conic-from-pos": dV, "mask-image-conic-to-pos": dW, "mask-image-conic-from-color": dX, "mask-image-conic-to-color": dY, "mask-mode": dZ, "mask-origin": d0, "mask-position": d1, "mask-repeat": d2, "mask-size": d3, "mask-type": d4, "mask-image": d5, filter: d6, blur: d7, brightness: d8, contrast: d9, "drop-shadow": C, "drop-shadow-color": ea, grayscale: eb, "hue-rotate": ec, invert: ed, saturate: ee, sepia: ef, "backdrop-filter": eg, "backdrop-blur": r, "backdrop-brightness": eh, "backdrop-contrast": ei, "backdrop-grayscale": ej, "backdrop-hue-rotate": ek, "backdrop-invert": el, "backdrop-opacity": em, "backdrop-saturate": en, "backdrop-sepia": eo, "border-collapse": ep, "border-spacing": eq, "border-spacing-x": er, "border-spacing-y": es, "table-layout": et, caption: eu, transition: ev, "transition-behavior": ew, duration: ex, ease: F, delay: ey, animate: G, backface: ez, perspective: D, "perspective-origin": eA, rotate: eB, "rotate-x": eC, "rotate-y": eD, "rotate-z": eE, scale: eF, "scale-x": eG, "scale-y": eH, "scale-z": eI, "scale-3d": eJ, skew: eK, "skew-x": eL, "skew-y": eM, transform: eN, "transform-origin": eO, "transform-style": eP, translate: eQ, "translate-x": eR, "translate-y": eS, "translate-z": eT, "translate-none": eU, accent: eV, appearance: eW, "caret-color": eX, "color-scheme": eY, cursor: [{cursor: eZ}], "field-sizing": [{"field-sizing": ["fixed", "content"]}], "pointer-events": [{"pointer-events": ["auto", "none"]}], resize: [{resize: ["none", "", "y", "x"]}], "scroll-behavior": [{scroll: ["auto", "smooth"]}], "scroll-m": [{"scroll-m": [b.value, a.value, c]}], "scroll-mx": [{"scroll-mx": [b.value, a.value, c]}], "scroll-my": [{"scroll-my": [b.value, a.value, c]}], "scroll-ms": [{"scroll-ms": [b.value, a.value, c]}], "scroll-me": [{"scroll-me": [b.value, a.value, c]}], "scroll-mbs": [{"scroll-mbs": [b.value, a.value, c]}], "scroll-mbe": [{"scroll-mbe": [b.value, a.value, c]}], "scroll-mt": [{"scroll-mt": [b.value, a.value, c]}], "scroll-mr": [{"scroll-mr": [b.value, a.value, c]}], "scroll-mb": [{"scroll-mb": [b.value, a.value, c]}], "scroll-ml": [{"scroll-ml": [b.value, a.value, c]}], "scroll-p": [{"scroll-p": [b.value, a.value, c]}], "scroll-px": [{"scroll-px": [b.value, a.value, c]}], "scroll-py": [{"scroll-py": [b.value, a.value, c]}], "scroll-ps": [{"scroll-ps": [b.value, a.value, c]}], "scroll-pe": [{"scroll-pe": [b.value, a.value, c]}], "scroll-pbs": [{"scroll-pbs": [b.value, a.value, c]}], "scroll-pbe": [{"scroll-pbe": [b.value, a.value, c]}], "scroll-pt": [{"scroll-pt": [b.value, a.value, c]}], "scroll-pr": [{"scroll-pr": [b.value, a.value, c]}], "scroll-pb": [{"scroll-pb": [b.value, a.value, c]}], "scroll-pl": [{"scroll-pl": [b.value, a.value, c]}], "snap-align": [{snap: ["start", "end", "center", "align-none"]}], "snap-stop": [{snap: ["normal", "always"]}], "snap-type": [{snap: ["none", "x", "y", "both"]}], "snap-strictness": [{snap: ["mandatory", "proximity"]}], touch: [{touch: ["auto", "none", "manipulation"]}], "touch-x": [{"touch-pan": ["x", "left", "right"]}], "touch-y": [{"touch-pan": ["y", "up", "down"]}], "touch-pz": ["touch-pinch-zoom"], select: [{select: ["none", "text", "all", "auto"]}], "will-change": [{"will-change": ["auto", "scroll", "contents", "transform", b.value, a.value]}], fill: [{fill: ["none", e, b.value, a.value]}], "stroke-w": [{stroke: [d, i, g, I]}], stroke: [{stroke: ["none", e, b.value, a.value]}], "forced-color-adjust": [{"forced-color-adjust": ["auto", "none"]}]};
    q = {overflow: ["overflow-x", "overflow-y"], overscroll: ["overscroll-x", "overscroll-y"], inset: ["inset-x", "inset-y", "inset-bs", "inset-be", "start", "end", "top", "right", "bottom", "left"], "inset-x": ["right", "left"], "inset-y": ["top", "bottom"], flex: ["basis", "grow", "shrink"], gap: ["gap-x", "gap-y"], p: ["px", "py", "ps", "pe", "pbs", "pbe", "pt", "pr", "pb", "pl"], px: ["pr", "pl"], py: ["pt", "pb"], m: ["mx", "my", "ms", "me", "mbs", "mbe", "mt", "mr", "mb", "ml"], mx: ["mr", "ml"], my: ["mt", "mb"], size: ["w", "h"], "font-size": ["leading"], "fvn-normal": ["fvn-ordinal", "fvn-slashed-zero", "fvn-figure", "fvn-spacing", "fvn-fraction"], "fvn-ordinal": ["fvn-normal"], "fvn-slashed-zero": ["fvn-normal"], "fvn-figure": ["fvn-normal"], "fvn-spacing": ["fvn-normal"], "fvn-fraction": ["fvn-normal"], "line-clamp": ["display", "overflow"], rounded: ["rounded-s", "rounded-e", "rounded-t", "rounded-r", "rounded-b", "rounded-l", "rounded-ss", "rounded-se", "rounded-ee", "rounded-es", "rounded-tl", "rounded-tr", "rounded-br", "rounded-bl"], "rounded-s": ["rounded-ss", "rounded-es"], "rounded-e": ["rounded-se", "rounded-ee"], "rounded-t": ["rounded-tl", "rounded-tr"], "rounded-r": ["rounded-tr", "rounded-br"], "rounded-b": ["rounded-br", "rounded-bl"], "rounded-l": ["rounded-tl", "rounded-bl"], "border-spacing": ["border-spacing-x", "border-spacing-y"], "border-w": ["border-w-x", "border-w-y", "border-w-s", "border-w-e", "border-w-bs", "border-w-be", "border-w-t", "border-w-r", "border-w-b", "border-w-l"], "border-w-x": ["border-w-r", "border-w-l"], "border-w-y": ["border-w-t", "border-w-b"], "border-color": ["border-color-x", "border-color-y", "border-color-s", "border-color-e", "border-color-bs", "border-color-be", "border-color-t", "border-color-r", "border-color-b", "border-color-l"], "border-color-x": ["border-color-r", "border-color-l"], "border-color-y": ["border-color-t", "border-color-b"], translate: ["translate-x", "translate-y", "translate-none"], "translate-none": ["translate", "translate-x", "translate-y", "translate-z"], "scroll-m": ["scroll-mx", "scroll-my", "scroll-ms", "scroll-me", "scroll-mbs", "scroll-mbe", "scroll-mt", "scroll-mr", "scroll-mb", "scroll-ml"], "scroll-mx": ["scroll-mr", "scroll-ml"], "scroll-my": ["scroll-mt", "scroll-mb"], "scroll-p": ["scroll-px", "scroll-py", "scroll-ps", "scroll-pe", "scroll-pbs", "scroll-pbe", "scroll-pt", "scroll-pr", "scroll-pb", "scroll-pl"], "scroll-px": ["scroll-pr", "scroll-pl"], "scroll-py": ["scroll-pt", "scroll-pb"], touch: ["touch-x", "touch-y", "touch-pz"], "touch-x": ["touch"], "touch-y": ["touch"], "touch-pz": ["touch"]};
    return {cacheSize: 500, theme: K, classGroups: e, conflictingClassGroups: q, conflictingClassGroupModifiers: {"font-size": ["leading"]}, orderSensitiveModifiers: ["*", "**", "after", "backdrop", "before", "details-content", "file", "first-letter", "first-line", "marker", "placeholder", "selection"]};
  };
}

function __mk19(a) {
  "use strict";
  return {$: (b) => {
    return a.test(b);
  }}.$;
}

function __mk21(a, b, c) {
  "use strict";
  return {B: (d) => {
    return (0 , c.value)(d, b.value, a);
  }}.B;
}

function __mk24(b) {
  "use strict";
  return {er: (c, d, e) => {
    let a;
    a: {
      a = b.exec(c);
      if (!!a) {
        b: {
          if (a[1]) {
            a = d(a[1]);
            break b;
          }
          a = e(a[2]);
        }
        break a;
      }
      a = !!a;
    }
    return a;
  }}.er;
}

function __mk25(a, b, c) {
  "use strict";
  return {D: (d) => {
    return (0 , b.value)(d, c.value, a);
  }}.D;
}

function __mk27(a, b, c) {
  "use strict";
  return {E: (d) => {
    return (0 , c.value)(d, b.value, a);
  }}.E;
}

function __mk29(a, b, c) {
  "use strict";
  return {F: (d) => {
    return (0 , c.value)(d, b.value, a);
  }}.F;
}

function __mk30(a) {
  "use strict";
  return {S: (b) => {
    return a.test(b);
  }}.S;
}

function __mk32(a, b, c) {
  "use strict";
  return {H: (d) => {
    return (0 , c.value)(d, b.value, a);
  }}.H;
}

function __mk33(a) {
  "use strict";
  return {P: (b) => {
    return a.test(b);
  }}.P;
}

function __mk36(a) {
  "use strict";
  return {J: (b) => {
    return a.test(b);
  }}.J;
}

function __mk37(a) {
  "use strict";
  return {K: (b) => {
    return a.test(b);
  }}.K;
}

function __mk38(a, b) {
  "use strict";
  return {L: (c) => {
    return (0 , a.value)(c, b.value);
  }}.L;
}

function __mk39(d) {
  "use strict";
  return function eo(e, f) {
    let b, a;
    const c = arguments;
    a: {
      b = c.length > 2 && void 0 !== c[2] && c[2];
      a = d.exec(e);
      if (!!a) {
        if (a[1]) {
          b = f(a[1]);
        }
        break a;
      }
      b = !!a;
    }
    return b;
  };
}

function __mk43(a) {
  "use strict";
  return {O: (b) => {
    return a.test(b);
  }}.O;
}

function __mk44(a, b) {
  "use strict";
  return {Q: (c) => {
    return (0 , b.value)(c, a.value);
  }}.Q;
}

function __mk45(a, b, c) {
  "use strict";
  return {R: (d) => {
    return (0 , b.value)(d, c.value, a);
  }}.R;
}

function __mk46(c, d) {
  "use strict";
  return {M: (b) => {
    let a;
    a = d.test(b);
    if (a) {
      a = !c.test(b);
    }
    return a;
  }}.M;
}

function __mk47(c) {
  "use strict";
  return {T: (b) => {
    let a;
    a = b.endsWith("%");
    if (a) {
      a = c(b.slice(0, -1));
    }
    return a;
  }}.T;
}

function __mk48(a, b, c) {
  "use strict";
  return {U: (d) => {
    return (0 , c.value)(d, b.value, a);
  }}.U;
}

function __mk50(a, b) {
  "use strict";
  return {V: (c) => {
    return (0 , a.value)(c, b.value);
  }}.V;
}

function __mk51(a, b) {
  "use strict";
  return {X: (c) => {
    return (0 , b.value)(c, a.value);
  }}.X;
}

function __mk52(a, b) {
  "use strict";
  return {Y: (c) => {
    return (0 , b.value)(c, a.value);
  }}.Y;
}

function __mk53(a, b) {
  "use strict";
  return {Z: (c) => {
    return (0 , b.value)(c, a.value, true);
  }}.Z;
}

function __mk54(a, b, c) {
  "use strict";
  return {_: (d) => {
    return (0 , c.value)(d, b.value, a);
  }}._;
}

function __mk56(a, b) {
  "use strict";
  return {ee: (c) => {
    return (0 , b.value)(c, a.value, true);
  }}.ee;
}

function __mk57(b) {
  "use strict";
  return {k: (c) => {
    let a;
    a = __mk58(c, b);
    a.isThemeGetter = true;
    return a;
  }}.k;
}

function __mk58(a, b) {
  "use strict";
  return {r: (c) => {
    return c[a] || b;
  }}.r;
}

function __mk59(c, d) {
  "use strict";
  return {q: (b) => {
    let a;
    a: {
      a = (0 , d.value)(b);
      if (!a) {
        a = !(0 , c.value)(b);
        break a;
      }
      a = !a;
    }
    return a;
  }}.q;
}

function __mk60(r, k, s) {
  "use strict";
  return {m: (l) => {
    let e, q, n, o, p, j, h, b, i, a, c, d, f, g;
    e = (0 , r.value)(l);
    if (e) {
      return e;
    }
    k.value;
    e = k.value;
    if (k.value == null) {
      throw new TypeError(__s0);
    }
    q = e.parseClassName;
    n = e.getClassGroupId;
    o = e.getConflictingClassGroupIds;
    e = e.sortModifiers;
    p = l.trim().split(u);
    j = p.length - 1;
    h = [];
    b = "";
    while (j >= 0) {
      i = p[j];
      a = q(i);
      if (a == null) {
        throw new TypeError(__s0);
      }
      a: {
        c = a.isExternal;
        d = a.modifiers;
        f = a.hasImportantModifier;
        g = a.baseClassName;
        a = a.maybePostfixModifierPosition;
        if (c) {
          b = i + (b.length > 0 ? " " + b : b);
          break a;
        }
        b: {
          if (!!a) {
            c = g.substring(0, a);
            break b;
          }
          c = g;
        }
        c = n(c);
        if (!c) {
          c: {
            if (!!!a) {
              a = !!!a;
              break c;
            }
            a = n(g);
            c = a;
            a = !a;
          }
          if (a) {
            b = i + (b.length > 0 ? " " + b : b);
            break a;
          }
          d: {
            g = false;
            if (0 === d.length) {
              a = "";
              break d;
            }
            e: {
              if (1 === d.length) {
                a = d[0];
                break e;
              }
              a = e(d).join(":");
            }
          }
          f = f ? a + "!" : a;
          a = f + c;
          if (h.indexOf(a) > -1) {
            break a;
          }
          h.push(a);
          c = o(c, g);
          a = 0;
          while (a < c.length) {
            d = c[a];
            h.push(f + d);
            a += 1;
          }
          b = i + (b.length > 0 ? " " + b : b);
          break a;
        }
        f: {
          g = !!a;
          if (0 === d.length) {
            a = "";
            break f;
          }
          g: {
            if (1 === d.length) {
              a = d[0];
              break g;
            }
            a = e(d).join(":");
          }
        }
        f = f ? a + "!" : a;
        a = f + c;
        if (h.indexOf(a) > -1) {
          break a;
        }
        h.push(a);
        c = o(c, g);
        a = 0;
        while (a < c.length) {
          d = c[a];
          h.push(f + d);
          a += 1;
        }
        b = i + (b.length > 0 ? " " + b : b);
      }
      j -= 1;
    }
    (0 , s.value)(l, b);
    return b;
  }}.m;
}

function __mk61(g) {
  "use strict";
  return function f() {
    let d, e, a, c, b;
    const h = arguments;
    d = h.length;
    e = Array(d);
    a = 0;
    while (a < d) {
      e[a] = h[a];
      a += 1;
    }
    d = void 0;
    a = 0;
    c = "";
    while (a < e.length) {
      a: {
        b: {
          b = e[a];
          if (b) {
            b = (0 , g.value)(b);
            d = b;
            if (b) {
              break b;
            }
            break a;
          }
          if (b) {
            break b;
          }
          break a;
        }
        if (c) {
          b = c + " ";
          c + " ";
          c = b;
        }
        c += d;
      }
      a += 1;
    }
    return c;
  };
}

function __mk62(f) {
  "use strict";
  return {l: (b, g) => {
    let d, e, a, c;
    d = r();
    for (c in b) {
      (0 , f.value)(b[c], d, c, g);
    }
    return d;
  }}.l;
}

function __mk63(f) {
  "use strict";
  return {g: (d) => {
    let a, b, c, e;
    if ("string" == typeof d) {
      return d;
    }
    a = "";
    b = 0;
    while (b < d.length) {
      c = d[b];
      if (c) {
        c = (0 , f.value)(d[b]);
        e = c;
        if (c) {
          if (a) {
            c = a + " ";
            a + " ";
            a = c;
          }
          a += e;
        }
        b += 1;
        continue;
      }
      b += 1;
    }
    return a;
  }}.g;
}

function __mk64(d) {
  "use strict";
  return {n: (b, e, f, g) => {
    let c, a;
    c = b.length;
    a = 0;
    while (a < c) {
      (0 , d.value)(b[a], e, f, g);
      a += 1;
    }
    return;
  }}.n;
}

function __mk65(e, f, g) {
  "use strict";
  return {s: (a, b, c, d) => {
    a: {
      if ("string" == typeof a) {
        (0 , e.value)(a, b, c);
        break a;
      }
      if ("function" == typeof a) {
        (0 , g.value)(a, b, c, d);
        break a;
      }
      (0 , f.value)(a, b, c, d);
    }
  }}.s;
}

function __mk66(e) {
  "use strict";
  return {a: (c, d, f) => {
    let b;
    a: {
      if ("" === c) {
        b = d;
        break a;
      }
      b = (0 , e.value)(d, c);
    }
    b.classGroupId = f;
  }}.a;
}

function __mk67(h) {
  "use strict";
  return {c: (i, j) => {
    let e, g, a, d, f, b;
    e = j.split("-");
    g = e.length;
    a = i;
    d = 0;
    while (d < g) {
      a: {
        f = e[d];
        b = a.nextPart.get(f);
        if (b) {
          a = b;
          break a;
        }
        b = (0 , h.value)();
        a.nextPart.set(f, b);
        a = b;
      }
      d += 1;
    }
    return a;
  }}.c;
}

function __mk69(j, h) {
  "use strict";
  return {d: (k, l, m, n) => {
    let g, i, e, b, a, f, c;
    g = Object.entries(k);
    i = g.length;
    e = 0;
    while (e < i) {
      a: {
        b = (g[e][Symbol.iterator])();
        a = b.next();
        if (a.done) {
          f = true;
          a = void 0;
          break a;
        }
        a = a.value;
        f = false;
      }
      b: {
        if (!f) {
          c = b.next();
          if (c.done) {
            f = true;
            c = void 0;
            break b;
          }
          c = c.value;
          break b;
        }
        c = void 0;
      }
      if (!f) {
        b.return != null && b.return();
      }
      b = h.value;
      a = (0 , j.value)(l, a);
      b.call(h, c, a, m, n);
      e += 1;
    }
    return;
  }}.d;
}

function __mk70(h, d) {
  "use strict";
  return {i: (c, b, e, f) => {
    let a, g;
    a: {
      if ((0 , h.value)(c)) {
        a = d.value;
        g = c(f);
        a.call(d, g, b, e, f);
        break a;
      }
      if (null === b.validators) {
        b.validators = [];
      }
      a = b.validators;
      a.push({classGroupId: e, validator: c});
    }
  }}.i;
}

(function () {
  let b, e, c, d, g, f, a, h;
  a: {
    try {
      b = globalThis;
      e = (new b.Error()).stack;
      c = e;
      if (c) {
        b: {
          d = b._debugIds;
          if (d) {
            break b;
          }
          g = b;
          f = {};
          g._debugIds = f;
          d = f;
        }
        d[e] = __s1;
        c = __s1;
        c = __s1;
      }
    } catch (i) {
    }
    a = globalThis.TURBOPACK;
    if (a) {
      break a;
    }
    a = [];
    TURBOPACK = a;
  }
  a.push;
  h = ["object" == typeof document ? document.currentScript : void 0, 877130, ({""(A) {
  "use strict";
  let B, t, w, z, C, q, e, r, f, a, d, b, u, h, n, g, i, j, l, o, D, c, v, p, E, x, y, s, m, k, F;
  B = A.s;
  t = [];
  w = {};
  z = {};
  C = __mk1(w, z);
  q = [];
  q = {value: q};
  e = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/;
  e = __mk19(e);
  r = ({A() {
  "use strict";
  return true;
}}.A);
  f = ({W() {
  "use strict";
  return false;
}}.W);
  a = ({en(a) {
  "use strict";
  return "length" === a || "size" === a || "bg-size" === a;
}}.en);
  a = {value: a};
  d = /^\[(?:(\w[\w-]*):)?(.+)\]$/i;
  b = __mk24(d);
  b = {value: b};
  u = __mk21(f, a, b);
  h = ({et(a) {
  "use strict";
  return "position" === a || "percentage" === a;
}}.et);
  h = {value: h};
  n = __mk25(f, b, h);
  g = ({ei(a) {
  "use strict";
  return "family-name" === a;
}}.ei);
  g = {value: g};
  f = __mk27(f, g, b);
  i = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/;
  i = __mk30(i);
  j = ({el(a) {
  "use strict";
  return "image" === a || "url" === a;
}}.el);
  j = {value: j};
  i = __mk29(i, j, b);
  l = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/;
  l = __mk33(l);
  o = ({ec(a) {
  "use strict";
  return "shadow" === a;
}}.ec);
  o = {value: o};
  l = __mk32(l, o, b);
  D = ({I(b) {
  "use strict";
  let a;
  a: {
    if (!!b) {
      a = Number(b);
      a = Number.isInteger(a);
      break a;
    }
    a = !!b;
  }
  return a;
}}.I);
  c = /^\((?:(\w[\w-]*):)?(.+)\)$/i;
  v = __mk36(c);
  v = {value: v};
  d = __mk37(d);
  d = {value: d};
  c = __mk39(c);
  c = {value: c};
  p = ({es(a) {
  "use strict";
  return "length" === a;
}}.es);
  p = {value: p};
  E = __mk38(c, p);
  x = ({N(b) {
  "use strict";
  let a;
  a: {
    if (!!b) {
      a = Number(b);
      a = !Number.isNaN(a);
      break a;
    }
    a = !!b;
  }
  return a;
}}.N);
  y = /^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/;
  y = __mk43(y);
  g = __mk44(g, c);
  s = /^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix)\(.+\)$/;
  m = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/;
  s = __mk46(s, m);
  p = __mk45(s, b, p);
  s = __mk47(x);
  m = ({ea(a) {
  "use strict";
  return "number" === a;
}}.ea);
  m = {value: m};
  m = __mk48(x, m, b);
  h = __mk50(c, h);
  a = __mk51(a, c);
  j = __mk52(j, c);
  o = __mk53(o, c);
  k = ({ed(a) {
  "use strict";
  return "number" === a || "weight" === a;
}}.ed);
  k = {value: k};
  b = __mk54(r, k, b);
  c = __mk56(k, c);
  k = [];
  k = __mk57(k);
  F = __mk59(v, d);
  e = __mk18(e, r, u, n, f, i, l, D, v, d, E, x, y, g, p, s, m, h, a, j, o, b, c, k, F);
  e = {value: e};
  r = {};
  f = {value: void 0};
  a = {value: void 0};
  d = {value: void 0};
  q = __mk2(w, ({b(a, c, d, e, f) {
  "use strict";
  return {modifiers: a, hasImportantModifier: c, baseClassName: d, maybePostfixModifierPosition: e, isExternal: f};
}}.b), q, e, r, __mk60(f, a, d), f, [], a, d);
  e = {};
  f = __mk61(e);
  a = {};
  d = __mk62(a);
  b = __mk63(e);
  u = {};
  h = __mk64(u);
  n = {value: __mk67({value: (function r() {
  "use strict";
  let a;
  a: {
    if (arguments.length > 0 && void 0 !== arguments[0]) {
      a = arguments[0];
      break a;
    }
    a = new Map([]);
  }
  return {nextPart: a, validators: arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null, classGroupId: arguments.length > 2 ? arguments[2] : void 0};
})})};
  g = {};
  i = {};
  j = __mk65({value: __mk66(n)}, g, i);
  n = __mk69(n, a);
  l = __mk70({value: ({m(a) {
  "use strict";
  return "isThemeGetter" in a && true === a.isThemeGetter;
}}.m)}, a);
  t[0] = "f";
  t[1] = 0;
  i.value = l;
  g.value = n;
  u.value = j;
  a.value = h;
  e.value = b;
  r.value = d;
  z.value = f;
  w.value = q;
  t[2] = C;
  B.call(A, t);
}}[""])];
  a.push(h);
})();
function main(a) {
  return a;
}
