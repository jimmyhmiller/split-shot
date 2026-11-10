function __mk0(n, k, p, l, q, j, r, s, t, m) {
  return function evaluate(c, g, h, i, u) {
    let a, e, b, d, f, o;
    a = c[0];
    e = s;
    if (a === "num") {
      e.value = -1;
      return c[1];
    }
    b = u;
    if (a === "local" || a === "this") {
      a = (0 , m.value)(c, g);
      b[a] = 0;
      e.value = i[a];
      return h[a];
    }
    if (a === "bin") {
      a: {
        a = (0 , k.value)(j.value[c[2]], g, h, i, b);
        d = e.value;
        b = (0 , k.value)(j.value[c[3]], g, h, i, b);
        f = e.value;
        if (d === -1 & f === -1) {
          b: {
            if (c[1] === "+") {
              a += b;
              break b;
            }
            if (a < b) {
              a = 1;
              break b;
            }
            a = 0;
          }
          break a;
        }
        a = hostArith(c[1], a, b);
      }
      c: {
        if (d === -1 & f === -1) {
          b = -1;
          break c;
        }
        b = hostShapeOf(a);
      }
      e.value = b;
      return a;
    }
    if (a === "get") {
      d: {
        a = (0 , m.value)(j.value[c[1]], g);
        if (a >= 0) {
          b = h[a];
          e = i[a];
          break d;
        }
        a = (0 , k.value)(j.value[c[1]], g, h, i, b);
        e = e.value;
        b = a;
      }
      return (0 , q.value)(e, b, c[2]);
    }
    if (a === "new") {
      e: {
        a = r.value.classes[c[1]];
        d = p.value[a.ctor + ":" + a.empty];
        f = hostNew(a.empty, d === void 0 ? 0 : (t.value[d]).keys.length);
        hostCall(a.ctor, a.empty, 1, "", f, (0 , n.value)(c[2], g, h, i, b));
        if (d === void 0) {
          hostNeedExit(a.ctor, a.empty);
          e.value = a.empty;
          break e;
        }
        e.value = d;
      }
      return f;
    }
    f: {
      a = (0 , m.value)(j.value[c[1]], g);
      if (a >= 0) {
        f = h[a];
        d = i[a];
        b[a] = 0;
        break f;
      }
      a = (0 , k.value)(j.value[c[1]], g, h, i, b);
      d = e.value;
      f = a;
    }
    a = (0 , l.value)(d, c[2], 0);
    d = (0 , l.value)(d, c[2], 1);
    if (a < 0) {
      a = hostShapeOf(f);
      d = (0 , l.value)(a, c[2], 0);
      o = (0 , l.value)(a, c[2], 1);
      a = d;
      d = o;
    }
    a = hostCall(a, d, 0, c[2], f, (0 , n.value)(c[3], g, h, i, b));
    e.value = hostShapeOf(a);
    return a;
  };
}

function __mk1(d, e) {
  return function argumentsOf(c, f, g, h, i) {
    let b, a;
    b = [];
    a = 0;
    while (a < c.length) {
      b[a] = (0 , d.value)(e[c[a]], f, g, h, i);
      a += 1;
    }
    return b;
  };
}

function __mk2(e, d) {
  return function findMethod(f, g, h) {
    let b, a, c;
    b = -1;
    a = 0;
    while (a < d.length) {
      c = (e.classes[(d[a]).cls]).methods[g];
      if (c !== void 0) {
        b = f === a ? h ? a : c : b;
        a += 1;
        continue;
      }
      a += 1;
    }
    return b;
  };
}

function __mk3(c, e) {
  return function get(f, d, b) {
    let a;
    a = c(f, b);
    if (a < 0) {
      a = c(hostShapeOf(d), b);
    }
    a = hostLoad(d, a, b);
    e.value = hostShapeOf(a);
    return a;
  };
}

function __mk4(g, d) {
  return function findSlot(f, e) {
    let b, a, c;
    b = -1;
    a = 0;
    while (a < g.length) {
      c = d(a, e);
      if (c >= 0) {
        if (f === a) {
          b = d(a, e);
        }
        a += 1;
        continue;
      }
      a += 1;
    }
    return b;
  };
}

function __mk5(c) {
  return function slotOf(d, e) {
    let b, a;
    b = (c[d]).keys;
    a = 0;
    while (a < b.length) {
      if (b[a] === e) {
        return a;
      }
      a += 1;
    }
    return -1;
  };
}

function __mk7(i, s, f, l, t, u) {
  return function execute(v, g, m, n, o, p) {
    let j, h, c, d, e, k, a, b, q, r;
    j = v[1];
    h = 0;
    c = m;
    d = n;
    e = o;
    k = p;
    while (h < j.length) {
      a: {
        a = f.value[j[h]];
        b = a[0];
        if (b === "setprop") {
          b = (0 , i.value)(f.value[a[3]], g, c, d, e);
          q = l.value;
          r = (0 , u.value)(f.value[a[1]], g);
          q.call(l, r, a[2], b, c, d, e);
          break a;
        }
        if (b === "setlocal") {
          b = (0 , i.value)(f.value[a[2]], g, c, d, e);
          c[a[1]] = b;
          d[a[1]] = t.value;
          e[a[1]] = 0;
          break a;
        }
        if (b === "while") {
          while ((0 , i.value)(f.value[a[1]], g, c, d, e)) {
            (0 , s.value)(f.value[a[2]], g, c, d, e, k);
          }
          break a;
        }
        if (b === "return") {
          k.result = (0 , i.value)(f.value[a[1]], g, c, d, e);
          break a;
        }
        (0 , i.value)(f.value[a[1]], g, c, d, e);
      }
      h += 1;
    }
    return;
  };
}

function __mk8(i, j, k) {
  return function set(a, c, f, g, h, l) {
    let b, d, e;
    a: {
      b = i(h[a], c);
      d = h;
      e = l;
      if (b >= 0) {
        hostStore(g[a], b, f);
        break a;
      }
      b: {
        if (e[a]) {
          b = k[d[a] + ":" + c];
          break b;
        }
        b = void 0;
      }
      if (b !== void 0) {
        hostAdd(g[a], b, j(b, c), f);
        d[a] = b;
        break a;
      }
      if (e[a]) {
        hostNeedShape(d[a], c);
      }
      hostSetGeneric(g[a], c, f);
      e[a] = 0;
    }
  };
}

function entry(a5) {
  let d, a, b, c, as, at, e, au, aA, ax, aB, ay, av, aC, a6, aI, a7, aM, a8, a9, aN, f, g, h, aO, i, j, k, aP, l, aQ, m, n, o, p, q, r, s, t, bj, u, v, w, x, y, z, aR, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, aS, Q, R, S, T, U, V, W, X, Y, Z, aa, aT, ab, ac, ba, ad, ae, af, ag, ah, ai, aj, aU, ak, al, am, an, ao, ap, bb, aq, ar, bc, aV, aJ, aw, bk, bd, be, bl, az, aD, aE, aF, aG, aH, aW, aK, bf, aL, bg, aX, bm, aY, bn, aZ, bh, a0, bi, a1, a2, a3, a4;
  let __pc = 0;
  for (;;) {
    switch (__pc) {
      case 0: {
        d = hostArg(a5, 0);
        a = hostShapeOf(d);
        __pc = 1; break;
      }
      case 1: {
        b = hostThis(a5);
        __pc = 2; break;
      }
      case 2: {
        c = hostNew(1, 2);
        __pc = 3; break;
      }
      case 3: {
        as = hostCall;
        at = c;
        e = c;
        c = hostNew(0, 2);
        __pc = 4; break;
      }
      case 4: {
        hostCall(1, 0, 1, "", c, [1, 2]);
        __pc = 5; break;
      }
      case 5: {
        au = c;
        c = hostNew(0, 2);
        __pc = 6; break;
      }
      case 6: {
        hostCall(1, 0, 1, "", c, [d, 3]);
        __pc = 7; break;
      }
      case 7: {
        as(3, 1, 1, "", e, [au, c]);
        __pc = 8; break;
      }
      case 8: {
        if (!(true & a === -1)) { __pc = 9; } else { __pc = 10; } break;
      }
      case 9: {
        c = hostArith("<", 0, d);
        __pc = 32; break;
      }
      case 10: {
        c = 0 < d;
        __pc = 11; break;
      }
      case 11: {
        c = c ? 1 : 0;
        __pc = 32; break;
      }
      case 12: {
        e = d(a[b[1]], 3, c, as, at);
        if (!(e)) { __pc = 14; } else { __pc = 13; } break;
      }
      case 13: {
        au(a[b[2]], 3, c, as, at, aA);
        __pc = 12; break;
      }
      case 14: {
        ax += 1;
        __pc = 15; break;
      }
      case 15: {
        if (!(ax < aB.length)) { __pc = 16; } else { __pc = 17; } break;
      }
      case 16: {
        hostExit(as[3]);
        return aA.result;
      }
      case 17: {
        b = a[aB[ax]];
        e = b[0];
        ay = as;
        av = aA;
        if (!(e === "setprop")) { __pc = 18; } else { __pc = 19; } break;
      }
      case 18: {
        if (!(e === "setlocal")) { __pc = 23; } else { __pc = 24; } break;
      }
      case 19: {
        e = d(a[b[3]], 3, c, as, at);
        aC(a6(a[b[1]], 3), b[2], e, c, as, at);
        __pc = 30; break;
      }
      case 20: {
        if (!(ax < aB.length)) { __pc = 21; } else { __pc = 22; } break;
      }
      case 21: {
        hostExit(ay[3]);
        return av.result;
      }
      case 22: {
        b = a[aB[ax]];
        e = b[0];
        if (!(e === "setprop")) { __pc = 18; } else { __pc = 19; } break;
      }
      case 23: {
        if (!(e === "while")) { __pc = 25; } else { __pc = 26; } break;
      }
      case 24: {
        e = d(a[b[2]], 3, c, as, at);
        c[b[1]] = e;
        as[b[1]] = aI.value;
        at[b[1]] = 0;
        __pc = 30; break;
      }
      case 25: {
        if (!(e === "return")) { __pc = 28; } else { __pc = 29; } break;
      }
      case 26: {
        e = d(a[b[1]], 3, c, as, at);
        if (!(e)) { __pc = 30; } else { __pc = 27; } break;
      }
      case 27: {
        au(a[b[2]], 3, c, as, at, aA);
        __pc = 26; break;
      }
      case 28: {
        d(a[b[1]], 3, c, as, at);
        __pc = 30; break;
      }
      case 29: {
        aA.result = d(a[b[1]], 3, c, as, at);
        __pc = 30; break;
      }
      case 30: {
        ax += 1;
        __pc = 20; break;
      }
      case 31: {
        hostExit(-2);
        return c;
      }
      case 32: {
        if (!(true & a === -1)) { __pc = 33; } else { __pc = 34; } break;
      }
      case 33: {
        hostShapeOf(c);
        __pc = 35; break;
      }
      case 34: {
        __pc = 35; break;
      }
      case 35: {
        if (!(c)) { __pc = 39; } else { __pc = 36; } break;
      }
      case 36: {
        c = hostCall(4, 5, 0, "step", at, []);
        hostShapeOf(c);
        __pc = 37; break;
      }
      case 37: {
        aI = {value: -1};
        aB = [7, 9, 21, 29];
        c = [d, at, 1, b];
        as = [a, 5, -1, -2];
        at = [0, 0, 0, 0];
        aA = {result: 0};
        b = ["while", 12, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        ax = 2;
        __pc = 38; break;
      }
      case 38: {
        e = {};
        au = {};
        a = [];
        ay = __mk1(au, a);
        av = {};
        aC = {};
        a7 = {};
        aM = {};
        a8 = {};
        a9 = {};
        aN = {};
        d = __mk0(e, au, av, aC, a7, aM, a8, aI, a9, aN);
        f = [];
        g = [];
        h = [];
        aO = [];
        i = [];
        j = [];
        k = [];
        aP = [];
        l = [];
        aQ = [];
        m = [];
        n = [];
        o = [];
        p = [];
        q = [];
        r = [];
        s = [];
        t = [];
        bj = [];
        u = [];
        v = [];
        w = [];
        x = [];
        y = [];
        z = [];
        aR = [];
        A = [];
        B = [];
        C = [];
        D = [];
        E = [];
        F = [];
        G = [];
        H = [];
        I = [];
        J = [];
        K = [];
        L = [];
        M = [];
        N = [];
        O = [];
        P = [];
        aS = [];
        Q = [];
        R = [];
        S = [];
        T = [];
        U = [];
        V = [];
        W = [];
        X = [];
        Y = [];
        Z = [];
        aa = [];
        aT = [];
        ab = [];
        ac = [];
        ba = [];
        ad = [];
        ae = [];
        af = [];
        ag = [];
        ah = [];
        ai = [];
        aj = [];
        aU = [];
        ak = [];
        al = [];
        am = [];
        an = [];
        ao = [];
        ap = [];
        bb = [];
        aq = [];
        ar = [];
        bc = [];
        aV = {};
        aJ = {};
        aw = [];
        bk = __mk2(aJ, aw);
        bd = __mk5(aw);
        be = __mk4(aw, bd);
        bl = __mk3(be, aI);
        a6 = function variable(a, b) {
  if (a[0] === "this") {
    return b;
  }
  if (a[0] === "local") {
    return a[1];
  }
  return -1;
};
        az = [];
        aD = {};
        aE = {};
        aF = {};
        aG = {};
        aH = {};
        aW = [];
        aK = {};
        bf = {};
        aL = {};
        bg = {};
        aX = {};
        bm = [];
        aY = {};
        bn = [];
        aZ = {};
        bh = [];
        a0 = {};
        bi = [];
        a1 = {};
        a2 = [];
        a3 = {};
        a4 = [];
        f[0] = "num";
        f[1] = 1;
        f[2] = 0;
        f[3] = 0;
        f[4] = 0;
        f[5] = 0;
        f[6] = 0;
        f[7] = 0;
        f[8] = 0;
        f[9] = 0;
        f[10] = 0;
        f[11] = 0;
        f[12] = 0;
        f[13] = 0;
        f[14] = 0;
        f[15] = 0;
        f[16] = 0;
        a[0] = f;
        g[0] = "num";
        g[1] = 2;
        g[2] = 0;
        g[3] = 0;
        g[4] = 0;
        g[5] = 0;
        g[6] = 0;
        g[7] = 0;
        g[8] = 0;
        g[9] = 0;
        g[10] = 0;
        g[11] = 0;
        g[12] = 0;
        g[13] = 0;
        g[14] = 0;
        g[15] = 0;
        g[16] = 0;
        a[1] = g;
        h[0] = "new";
        h[1] = 0;
        aO[0] = 0;
        aO[1] = 1;
        h[2] = aO;
        h[3] = 0;
        h[4] = 0;
        h[5] = 0;
        h[6] = 0;
        h[7] = 0;
        h[8] = 0;
        h[9] = 0;
        h[10] = 0;
        h[11] = 0;
        h[12] = 0;
        h[13] = 0;
        h[14] = 0;
        h[15] = 0;
        h[16] = 0;
        a[2] = h;
        i[0] = "local";
        i[1] = 0;
        i[2] = 0;
        i[3] = 0;
        i[4] = 0;
        i[5] = 0;
        i[6] = 0;
        i[7] = 0;
        i[8] = 0;
        i[9] = 0;
        i[10] = 0;
        i[11] = 0;
        i[12] = 0;
        i[13] = 0;
        i[14] = 0;
        i[15] = 0;
        i[16] = 0;
        a[3] = i;
        j[0] = "num";
        j[1] = 3;
        j[2] = 0;
        j[3] = 0;
        j[4] = 0;
        j[5] = 0;
        j[6] = 0;
        j[7] = 0;
        j[8] = 0;
        j[9] = 0;
        j[10] = 0;
        j[11] = 0;
        j[12] = 0;
        j[13] = 0;
        j[14] = 0;
        j[15] = 0;
        j[16] = 0;
        a[4] = j;
        k[0] = "new";
        k[1] = 0;
        aP[0] = 3;
        aP[1] = 4;
        k[2] = aP;
        k[3] = 0;
        k[4] = 0;
        k[5] = 0;
        k[6] = 0;
        k[7] = 0;
        k[8] = 0;
        k[9] = 0;
        k[10] = 0;
        k[11] = 0;
        k[12] = 0;
        k[13] = 0;
        k[14] = 0;
        k[15] = 0;
        k[16] = 0;
        a[5] = k;
        l[0] = "new";
        l[1] = 1;
        aQ[0] = 2;
        aQ[1] = 5;
        l[2] = aQ;
        l[3] = 0;
        l[4] = 0;
        l[5] = 0;
        l[6] = 0;
        l[7] = 0;
        l[8] = 0;
        l[9] = 0;
        l[10] = 0;
        l[11] = 0;
        l[12] = 0;
        l[13] = 0;
        l[14] = 0;
        l[15] = 0;
        l[16] = 0;
        a[6] = l;
        m[0] = "setlocal";
        m[1] = 1;
        m[2] = 6;
        m[3] = 0;
        m[4] = 0;
        m[5] = 0;
        m[6] = 0;
        m[7] = 0;
        m[8] = 0;
        m[9] = 0;
        m[10] = 0;
        m[11] = 0;
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 0;
        m[16] = 0;
        a[7] = m;
        n[0] = "num";
        n[1] = 0;
        n[2] = 0;
        n[3] = 0;
        n[4] = 0;
        n[5] = 0;
        n[6] = 0;
        n[7] = 0;
        n[8] = 0;
        n[9] = 0;
        n[10] = 0;
        n[11] = 0;
        n[12] = 0;
        n[13] = 0;
        n[14] = 0;
        n[15] = 0;
        n[16] = 0;
        a[8] = n;
        o[0] = "setlocal";
        o[1] = 2;
        o[2] = 8;
        o[3] = 0;
        o[4] = 0;
        o[5] = 0;
        o[6] = 0;
        o[7] = 0;
        o[8] = 0;
        o[9] = 0;
        o[10] = 0;
        o[11] = 0;
        o[12] = 0;
        o[13] = 0;
        o[14] = 0;
        o[15] = 0;
        o[16] = 0;
        a[9] = o;
        p[0] = "local";
        p[1] = 2;
        p[2] = 0;
        p[3] = 0;
        p[4] = 0;
        p[5] = 0;
        p[6] = 0;
        p[7] = 0;
        p[8] = 0;
        p[9] = 0;
        p[10] = 0;
        p[11] = 0;
        p[12] = 0;
        p[13] = 0;
        p[14] = 0;
        p[15] = 0;
        p[16] = 0;
        a[10] = p;
        q[0] = "local";
        q[1] = 0;
        q[2] = 0;
        q[3] = 0;
        q[4] = 0;
        q[5] = 0;
        q[6] = 0;
        q[7] = 0;
        q[8] = 0;
        q[9] = 0;
        q[10] = 0;
        q[11] = 0;
        q[12] = 0;
        q[13] = 0;
        q[14] = 0;
        q[15] = 0;
        q[16] = 0;
        a[11] = q;
        r[0] = "bin";
        r[1] = "<";
        r[2] = 10;
        r[3] = 11;
        r[4] = 0;
        r[5] = 0;
        r[6] = 0;
        r[7] = 0;
        r[8] = 0;
        r[9] = 0;
        r[10] = 0;
        r[11] = 0;
        r[12] = 0;
        r[13] = 0;
        r[14] = 0;
        r[15] = 0;
        r[16] = 0;
        a[12] = r;
        s[0] = "local";
        s[1] = 1;
        s[2] = 0;
        s[3] = 0;
        s[4] = 0;
        s[5] = 0;
        s[6] = 0;
        s[7] = 0;
        s[8] = 0;
        s[9] = 0;
        s[10] = 0;
        s[11] = 0;
        s[12] = 0;
        s[13] = 0;
        s[14] = 0;
        s[15] = 0;
        s[16] = 0;
        a[13] = s;
        t[0] = "call";
        t[1] = 13;
        t[2] = "step";
        t[3] = bj;
        t[4] = 0;
        t[5] = 0;
        t[6] = 0;
        t[7] = 0;
        t[8] = 0;
        t[9] = 0;
        t[10] = 0;
        t[11] = 0;
        t[12] = 0;
        t[13] = 0;
        t[14] = 0;
        t[15] = 0;
        t[16] = 0;
        a[14] = t;
        u[0] = "expr";
        u[1] = 14;
        u[2] = 0;
        u[3] = 0;
        u[4] = 0;
        u[5] = 0;
        u[6] = 0;
        u[7] = 0;
        u[8] = 0;
        u[9] = 0;
        u[10] = 0;
        u[11] = 0;
        u[12] = 0;
        u[13] = 0;
        u[14] = 0;
        u[15] = 0;
        u[16] = 0;
        a[15] = u;
        v[0] = "local";
        v[1] = 2;
        v[2] = 0;
        v[3] = 0;
        v[4] = 0;
        v[5] = 0;
        v[6] = 0;
        v[7] = 0;
        v[8] = 0;
        v[9] = 0;
        v[10] = 0;
        v[11] = 0;
        v[12] = 0;
        v[13] = 0;
        v[14] = 0;
        v[15] = 0;
        v[16] = 0;
        a[16] = v;
        w[0] = "num";
        w[1] = 1;
        w[2] = 0;
        w[3] = 0;
        w[4] = 0;
        w[5] = 0;
        w[6] = 0;
        w[7] = 0;
        w[8] = 0;
        w[9] = 0;
        w[10] = 0;
        w[11] = 0;
        w[12] = 0;
        w[13] = 0;
        w[14] = 0;
        w[15] = 0;
        w[16] = 0;
        a[17] = w;
        x[0] = "bin";
        x[1] = "+";
        x[2] = 16;
        x[3] = 17;
        x[4] = 0;
        x[5] = 0;
        x[6] = 0;
        x[7] = 0;
        x[8] = 0;
        x[9] = 0;
        x[10] = 0;
        x[11] = 0;
        x[12] = 0;
        x[13] = 0;
        x[14] = 0;
        x[15] = 0;
        x[16] = 0;
        a[18] = x;
        y[0] = "setlocal";
        y[1] = 2;
        y[2] = 18;
        y[3] = 0;
        y[4] = 0;
        y[5] = 0;
        y[6] = 0;
        y[7] = 0;
        y[8] = 0;
        y[9] = 0;
        y[10] = 0;
        y[11] = 0;
        y[12] = 0;
        y[13] = 0;
        y[14] = 0;
        y[15] = 0;
        y[16] = 0;
        a[19] = y;
        z[0] = "block";
        aR[0] = 15;
        aR[1] = 19;
        z[1] = aR;
        z[2] = 0;
        z[3] = 0;
        z[4] = 0;
        z[5] = 0;
        z[6] = 0;
        z[7] = 0;
        z[8] = 0;
        z[9] = 0;
        z[10] = 0;
        z[11] = 0;
        z[12] = 0;
        z[13] = 0;
        z[14] = 0;
        z[15] = 0;
        z[16] = 0;
        a[20] = z;
        a[21] = b;
        A[0] = "local";
        A[1] = 1;
        A[2] = 0;
        A[3] = 0;
        A[4] = 0;
        A[5] = 0;
        A[6] = 0;
        A[7] = 0;
        A[8] = 0;
        A[9] = 0;
        A[10] = 0;
        A[11] = 0;
        A[12] = 0;
        A[13] = 0;
        A[14] = 0;
        A[15] = 0;
        A[16] = 0;
        a[22] = A;
        B[0] = "get";
        B[1] = 22;
        B[2] = "pos";
        B[3] = 0;
        B[4] = 0;
        B[5] = 0;
        B[6] = 0;
        B[7] = 0;
        B[8] = 0;
        B[9] = 0;
        B[10] = 0;
        B[11] = 0;
        B[12] = 0;
        B[13] = 0;
        B[14] = 0;
        B[15] = 0;
        B[16] = 0;
        a[23] = B;
        C[0] = "get";
        C[1] = 23;
        C[2] = "x";
        C[3] = 0;
        C[4] = 0;
        C[5] = 0;
        C[6] = 0;
        C[7] = 0;
        C[8] = 0;
        C[9] = 0;
        C[10] = 0;
        C[11] = 0;
        C[12] = 0;
        C[13] = 0;
        C[14] = 0;
        C[15] = 0;
        C[16] = 0;
        a[24] = C;
        D[0] = "local";
        D[1] = 1;
        D[2] = 0;
        D[3] = 0;
        D[4] = 0;
        D[5] = 0;
        D[6] = 0;
        D[7] = 0;
        D[8] = 0;
        D[9] = 0;
        D[10] = 0;
        D[11] = 0;
        D[12] = 0;
        D[13] = 0;
        D[14] = 0;
        D[15] = 0;
        D[16] = 0;
        a[25] = D;
        E[0] = "get";
        E[1] = 25;
        E[2] = "pos";
        E[3] = 0;
        E[4] = 0;
        E[5] = 0;
        E[6] = 0;
        E[7] = 0;
        E[8] = 0;
        E[9] = 0;
        E[10] = 0;
        E[11] = 0;
        E[12] = 0;
        E[13] = 0;
        E[14] = 0;
        E[15] = 0;
        E[16] = 0;
        a[26] = E;
        F[0] = "get";
        F[1] = 26;
        F[2] = "y";
        F[3] = 0;
        F[4] = 0;
        F[5] = 0;
        F[6] = 0;
        F[7] = 0;
        F[8] = 0;
        F[9] = 0;
        F[10] = 0;
        F[11] = 0;
        F[12] = 0;
        F[13] = 0;
        F[14] = 0;
        F[15] = 0;
        F[16] = 0;
        a[27] = F;
        G[0] = "bin";
        G[1] = "+";
        G[2] = 24;
        G[3] = 27;
        G[4] = 0;
        G[5] = 0;
        G[6] = 0;
        G[7] = 0;
        G[8] = 0;
        G[9] = 0;
        G[10] = 0;
        G[11] = 0;
        G[12] = 0;
        G[13] = 0;
        G[14] = 0;
        G[15] = 0;
        G[16] = 0;
        a[28] = G;
        H[0] = "return";
        H[1] = 28;
        H[2] = 0;
        H[3] = 0;
        H[4] = 0;
        H[5] = 0;
        H[6] = 0;
        H[7] = 0;
        H[8] = 0;
        H[9] = 0;
        H[10] = 0;
        H[11] = 0;
        H[12] = 0;
        H[13] = 0;
        H[14] = 0;
        H[15] = 0;
        H[16] = 0;
        a[29] = H;
        I[0] = "block";
        I[1] = aB;
        I[2] = 0;
        I[3] = 0;
        I[4] = 0;
        I[5] = 0;
        I[6] = 0;
        I[7] = 0;
        I[8] = 0;
        I[9] = 0;
        I[10] = 0;
        I[11] = 0;
        I[12] = 0;
        I[13] = 0;
        I[14] = 0;
        I[15] = 0;
        I[16] = 0;
        a[30] = I;
        J[0] = "this";
        J[1] = 0;
        J[2] = 0;
        J[3] = 0;
        J[4] = 0;
        J[5] = 0;
        J[6] = 0;
        J[7] = 0;
        J[8] = 0;
        J[9] = 0;
        J[10] = 0;
        J[11] = 0;
        J[12] = 0;
        J[13] = 0;
        J[14] = 0;
        J[15] = 0;
        J[16] = 0;
        a[31] = J;
        K[0] = "local";
        K[1] = 0;
        K[2] = 0;
        K[3] = 0;
        K[4] = 0;
        K[5] = 0;
        K[6] = 0;
        K[7] = 0;
        K[8] = 0;
        K[9] = 0;
        K[10] = 0;
        K[11] = 0;
        K[12] = 0;
        K[13] = 0;
        K[14] = 0;
        K[15] = 0;
        K[16] = 0;
        a[32] = K;
        L[0] = "setprop";
        L[1] = 31;
        L[2] = "x";
        L[3] = 32;
        L[4] = 0;
        L[5] = 0;
        L[6] = 0;
        L[7] = 0;
        L[8] = 0;
        L[9] = 0;
        L[10] = 0;
        L[11] = 0;
        L[12] = 0;
        L[13] = 0;
        L[14] = 0;
        L[15] = 0;
        L[16] = 0;
        a[33] = L;
        M[0] = "this";
        M[1] = 0;
        M[2] = 0;
        M[3] = 0;
        M[4] = 0;
        M[5] = 0;
        M[6] = 0;
        M[7] = 0;
        M[8] = 0;
        M[9] = 0;
        M[10] = 0;
        M[11] = 0;
        M[12] = 0;
        M[13] = 0;
        M[14] = 0;
        M[15] = 0;
        M[16] = 0;
        a[34] = M;
        N[0] = "local";
        N[1] = 1;
        N[2] = 0;
        N[3] = 0;
        N[4] = 0;
        N[5] = 0;
        N[6] = 0;
        N[7] = 0;
        N[8] = 0;
        N[9] = 0;
        N[10] = 0;
        N[11] = 0;
        N[12] = 0;
        N[13] = 0;
        N[14] = 0;
        N[15] = 0;
        N[16] = 0;
        a[35] = N;
        O[0] = "setprop";
        O[1] = 34;
        O[2] = "y";
        O[3] = 35;
        O[4] = 0;
        O[5] = 0;
        O[6] = 0;
        O[7] = 0;
        O[8] = 0;
        O[9] = 0;
        O[10] = 0;
        O[11] = 0;
        O[12] = 0;
        O[13] = 0;
        O[14] = 0;
        O[15] = 0;
        O[16] = 0;
        a[36] = O;
        P[0] = "block";
        aS[0] = 33;
        aS[1] = 36;
        P[1] = aS;
        P[2] = 0;
        P[3] = 0;
        P[4] = 0;
        P[5] = 0;
        P[6] = 0;
        P[7] = 0;
        P[8] = 0;
        P[9] = 0;
        P[10] = 0;
        P[11] = 0;
        P[12] = 0;
        P[13] = 0;
        P[14] = 0;
        P[15] = 0;
        P[16] = 0;
        a[37] = P;
        Q[0] = "this";
        Q[1] = 0;
        Q[2] = 0;
        Q[3] = 0;
        Q[4] = 0;
        Q[5] = 0;
        Q[6] = 0;
        Q[7] = 0;
        Q[8] = 0;
        Q[9] = 0;
        Q[10] = 0;
        Q[11] = 0;
        Q[12] = 0;
        Q[13] = 0;
        Q[14] = 0;
        Q[15] = 0;
        Q[16] = 0;
        a[38] = Q;
        R[0] = "get";
        R[1] = 38;
        R[2] = "x";
        R[3] = 0;
        R[4] = 0;
        R[5] = 0;
        R[6] = 0;
        R[7] = 0;
        R[8] = 0;
        R[9] = 0;
        R[10] = 0;
        R[11] = 0;
        R[12] = 0;
        R[13] = 0;
        R[14] = 0;
        R[15] = 0;
        R[16] = 0;
        a[39] = R;
        S[0] = "local";
        S[1] = 0;
        S[2] = 0;
        S[3] = 0;
        S[4] = 0;
        S[5] = 0;
        S[6] = 0;
        S[7] = 0;
        S[8] = 0;
        S[9] = 0;
        S[10] = 0;
        S[11] = 0;
        S[12] = 0;
        S[13] = 0;
        S[14] = 0;
        S[15] = 0;
        S[16] = 0;
        a[40] = S;
        T[0] = "get";
        T[1] = 40;
        T[2] = "x";
        T[3] = 0;
        T[4] = 0;
        T[5] = 0;
        T[6] = 0;
        T[7] = 0;
        T[8] = 0;
        T[9] = 0;
        T[10] = 0;
        T[11] = 0;
        T[12] = 0;
        T[13] = 0;
        T[14] = 0;
        T[15] = 0;
        T[16] = 0;
        a[41] = T;
        U[0] = "bin";
        U[1] = "+";
        U[2] = 39;
        U[3] = 41;
        U[4] = 0;
        U[5] = 0;
        U[6] = 0;
        U[7] = 0;
        U[8] = 0;
        U[9] = 0;
        U[10] = 0;
        U[11] = 0;
        U[12] = 0;
        U[13] = 0;
        U[14] = 0;
        U[15] = 0;
        U[16] = 0;
        a[42] = U;
        V[0] = "this";
        V[1] = 0;
        V[2] = 0;
        V[3] = 0;
        V[4] = 0;
        V[5] = 0;
        V[6] = 0;
        V[7] = 0;
        V[8] = 0;
        V[9] = 0;
        V[10] = 0;
        V[11] = 0;
        V[12] = 0;
        V[13] = 0;
        V[14] = 0;
        V[15] = 0;
        V[16] = 0;
        a[43] = V;
        W[0] = "get";
        W[1] = 43;
        W[2] = "y";
        W[3] = 0;
        W[4] = 0;
        W[5] = 0;
        W[6] = 0;
        W[7] = 0;
        W[8] = 0;
        W[9] = 0;
        W[10] = 0;
        W[11] = 0;
        W[12] = 0;
        W[13] = 0;
        W[14] = 0;
        W[15] = 0;
        W[16] = 0;
        a[44] = W;
        X[0] = "local";
        X[1] = 0;
        X[2] = 0;
        X[3] = 0;
        X[4] = 0;
        X[5] = 0;
        X[6] = 0;
        X[7] = 0;
        X[8] = 0;
        X[9] = 0;
        X[10] = 0;
        X[11] = 0;
        X[12] = 0;
        X[13] = 0;
        X[14] = 0;
        X[15] = 0;
        X[16] = 0;
        a[45] = X;
        Y[0] = "get";
        Y[1] = 45;
        Y[2] = "y";
        Y[3] = 0;
        Y[4] = 0;
        Y[5] = 0;
        Y[6] = 0;
        Y[7] = 0;
        Y[8] = 0;
        Y[9] = 0;
        Y[10] = 0;
        Y[11] = 0;
        Y[12] = 0;
        Y[13] = 0;
        Y[14] = 0;
        Y[15] = 0;
        Y[16] = 0;
        a[46] = Y;
        Z[0] = "bin";
        Z[1] = "+";
        Z[2] = 44;
        Z[3] = 46;
        Z[4] = 0;
        Z[5] = 0;
        Z[6] = 0;
        Z[7] = 0;
        Z[8] = 0;
        Z[9] = 0;
        Z[10] = 0;
        Z[11] = 0;
        Z[12] = 0;
        Z[13] = 0;
        Z[14] = 0;
        Z[15] = 0;
        Z[16] = 0;
        a[47] = Z;
        aa[0] = "new";
        aa[1] = 0;
        aT[0] = 42;
        aT[1] = 47;
        aa[2] = aT;
        aa[3] = 0;
        aa[4] = 0;
        aa[5] = 0;
        aa[6] = 0;
        aa[7] = 0;
        aa[8] = 0;
        aa[9] = 0;
        aa[10] = 0;
        aa[11] = 0;
        aa[12] = 0;
        aa[13] = 0;
        aa[14] = 0;
        aa[15] = 0;
        aa[16] = 0;
        a[48] = aa;
        ab[0] = "return";
        ab[1] = 48;
        ab[2] = 0;
        ab[3] = 0;
        ab[4] = 0;
        ab[5] = 0;
        ab[6] = 0;
        ab[7] = 0;
        ab[8] = 0;
        ab[9] = 0;
        ab[10] = 0;
        ab[11] = 0;
        ab[12] = 0;
        ab[13] = 0;
        ab[14] = 0;
        ab[15] = 0;
        ab[16] = 0;
        a[49] = ab;
        ac[0] = "block";
        ba[0] = 49;
        ac[1] = ba;
        ac[2] = 0;
        ac[3] = 0;
        ac[4] = 0;
        ac[5] = 0;
        ac[6] = 0;
        ac[7] = 0;
        ac[8] = 0;
        ac[9] = 0;
        ac[10] = 0;
        ac[11] = 0;
        ac[12] = 0;
        ac[13] = 0;
        ac[14] = 0;
        ac[15] = 0;
        ac[16] = 0;
        a[50] = ac;
        ad[0] = "this";
        ad[1] = 0;
        ad[2] = 0;
        ad[3] = 0;
        ad[4] = 0;
        ad[5] = 0;
        ad[6] = 0;
        ad[7] = 0;
        ad[8] = 0;
        ad[9] = 0;
        ad[10] = 0;
        ad[11] = 0;
        ad[12] = 0;
        ad[13] = 0;
        ad[14] = 0;
        ad[15] = 0;
        ad[16] = 0;
        a[51] = ad;
        ae[0] = "local";
        ae[1] = 0;
        ae[2] = 0;
        ae[3] = 0;
        ae[4] = 0;
        ae[5] = 0;
        ae[6] = 0;
        ae[7] = 0;
        ae[8] = 0;
        ae[9] = 0;
        ae[10] = 0;
        ae[11] = 0;
        ae[12] = 0;
        ae[13] = 0;
        ae[14] = 0;
        ae[15] = 0;
        ae[16] = 0;
        a[52] = ae;
        af[0] = "setprop";
        af[1] = 51;
        af[2] = "pos";
        af[3] = 52;
        af[4] = 0;
        af[5] = 0;
        af[6] = 0;
        af[7] = 0;
        af[8] = 0;
        af[9] = 0;
        af[10] = 0;
        af[11] = 0;
        af[12] = 0;
        af[13] = 0;
        af[14] = 0;
        af[15] = 0;
        af[16] = 0;
        a[53] = af;
        ag[0] = "this";
        ag[1] = 0;
        ag[2] = 0;
        ag[3] = 0;
        ag[4] = 0;
        ag[5] = 0;
        ag[6] = 0;
        ag[7] = 0;
        ag[8] = 0;
        ag[9] = 0;
        ag[10] = 0;
        ag[11] = 0;
        ag[12] = 0;
        ag[13] = 0;
        ag[14] = 0;
        ag[15] = 0;
        ag[16] = 0;
        a[54] = ag;
        ah[0] = "local";
        ah[1] = 1;
        ah[2] = 0;
        ah[3] = 0;
        ah[4] = 0;
        ah[5] = 0;
        ah[6] = 0;
        ah[7] = 0;
        ah[8] = 0;
        ah[9] = 0;
        ah[10] = 0;
        ah[11] = 0;
        ah[12] = 0;
        ah[13] = 0;
        ah[14] = 0;
        ah[15] = 0;
        ah[16] = 0;
        a[55] = ah;
        ai[0] = "setprop";
        ai[1] = 54;
        ai[2] = "vel";
        ai[3] = 55;
        ai[4] = 0;
        ai[5] = 0;
        ai[6] = 0;
        ai[7] = 0;
        ai[8] = 0;
        ai[9] = 0;
        ai[10] = 0;
        ai[11] = 0;
        ai[12] = 0;
        ai[13] = 0;
        ai[14] = 0;
        ai[15] = 0;
        ai[16] = 0;
        a[56] = ai;
        aj[0] = "block";
        aU[0] = 53;
        aU[1] = 56;
        aj[1] = aU;
        aj[2] = 0;
        aj[3] = 0;
        aj[4] = 0;
        aj[5] = 0;
        aj[6] = 0;
        aj[7] = 0;
        aj[8] = 0;
        aj[9] = 0;
        aj[10] = 0;
        aj[11] = 0;
        aj[12] = 0;
        aj[13] = 0;
        aj[14] = 0;
        aj[15] = 0;
        aj[16] = 0;
        a[57] = aj;
        ak[0] = "this";
        ak[1] = 0;
        ak[2] = 0;
        ak[3] = 0;
        ak[4] = 0;
        ak[5] = 0;
        ak[6] = 0;
        ak[7] = 0;
        ak[8] = 0;
        ak[9] = 0;
        ak[10] = 0;
        ak[11] = 0;
        ak[12] = 0;
        ak[13] = 0;
        ak[14] = 0;
        ak[15] = 0;
        ak[16] = 0;
        a[58] = ak;
        al[0] = "this";
        al[1] = 0;
        al[2] = 0;
        al[3] = 0;
        al[4] = 0;
        al[5] = 0;
        al[6] = 0;
        al[7] = 0;
        al[8] = 0;
        al[9] = 0;
        al[10] = 0;
        al[11] = 0;
        al[12] = 0;
        al[13] = 0;
        al[14] = 0;
        al[15] = 0;
        al[16] = 0;
        a[59] = al;
        am[0] = "get";
        am[1] = 59;
        am[2] = "pos";
        am[3] = 0;
        am[4] = 0;
        am[5] = 0;
        am[6] = 0;
        am[7] = 0;
        am[8] = 0;
        am[9] = 0;
        am[10] = 0;
        am[11] = 0;
        am[12] = 0;
        am[13] = 0;
        am[14] = 0;
        am[15] = 0;
        am[16] = 0;
        a[60] = am;
        an[0] = "this";
        an[1] = 0;
        an[2] = 0;
        an[3] = 0;
        an[4] = 0;
        an[5] = 0;
        an[6] = 0;
        an[7] = 0;
        an[8] = 0;
        an[9] = 0;
        an[10] = 0;
        an[11] = 0;
        an[12] = 0;
        an[13] = 0;
        an[14] = 0;
        an[15] = 0;
        an[16] = 0;
        a[61] = an;
        ao[0] = "get";
        ao[1] = 61;
        ao[2] = "vel";
        ao[3] = 0;
        ao[4] = 0;
        ao[5] = 0;
        ao[6] = 0;
        ao[7] = 0;
        ao[8] = 0;
        ao[9] = 0;
        ao[10] = 0;
        ao[11] = 0;
        ao[12] = 0;
        ao[13] = 0;
        ao[14] = 0;
        ao[15] = 0;
        ao[16] = 0;
        a[62] = ao;
        ap[0] = "call";
        ap[1] = 60;
        ap[2] = "add";
        bb[0] = 62;
        ap[3] = bb;
        ap[4] = 0;
        ap[5] = 0;
        ap[6] = 0;
        ap[7] = 0;
        ap[8] = 0;
        ap[9] = 0;
        ap[10] = 0;
        ap[11] = 0;
        ap[12] = 0;
        ap[13] = 0;
        ap[14] = 0;
        ap[15] = 0;
        ap[16] = 0;
        a[63] = ap;
        aq[0] = "setprop";
        aq[1] = 58;
        aq[2] = "pos";
        aq[3] = 63;
        aq[4] = 0;
        aq[5] = 0;
        aq[6] = 0;
        aq[7] = 0;
        aq[8] = 0;
        aq[9] = 0;
        aq[10] = 0;
        aq[11] = 0;
        aq[12] = 0;
        aq[13] = 0;
        aq[14] = 0;
        aq[15] = 0;
        aq[16] = 0;
        a[64] = aq;
        ar[0] = "block";
        bc[0] = 64;
        ar[1] = bc;
        ar[2] = 0;
        ar[3] = 0;
        ar[4] = 0;
        ar[5] = 0;
        ar[6] = 0;
        ar[7] = 0;
        ar[8] = 0;
        ar[9] = 0;
        ar[10] = 0;
        ar[11] = 0;
        ar[12] = 0;
        ar[13] = 0;
        ar[14] = 0;
        ar[15] = 0;
        ar[16] = 0;
        a[65] = ar;
        aV["1:0"] = 4;
        aV["3:1"] = 5;
        av.value = aV;
        aM.value = a;
        a8.value = aJ;
        a9.value = aw;
        aD.name = "main";
        aD.params = 1;
        aD.locals = 3;
        aD.body = 30;
        az[0] = aD;
        aE.name = "Vec";
        aE.params = 2;
        aE.locals = 2;
        aE.body = 37;
        az[1] = aE;
        aF.name = "Vec.add";
        aF.params = 1;
        aF.locals = 1;
        aF.body = 50;
        az[2] = aF;
        aG.name = "Ent";
        aG.params = 2;
        aG.locals = 2;
        aG.body = 57;
        az[3] = aG;
        aH.name = "Ent.step";
        aH.params = 0;
        aH.locals = 0;
        aH.body = 65;
        az[4] = aH;
        bf.add = 2;
        aK.ctor = 1;
        aK.methods = bf;
        aK.empty = 0;
        aW[0] = aK;
        bg.step = 4;
        aL.ctor = 3;
        aL.methods = bg;
        aL.empty = 1;
        aW[1] = aL;
        aJ.functions = az;
        aJ.classes = aW;
        aX.cls = 0;
        aX.keys = bm;
        aw[0] = aX;
        aY.cls = 1;
        aY.keys = bn;
        aw[1] = aY;
        bh[0] = "x";
        aZ.cls = 0;
        aZ.keys = bh;
        aw[2] = aZ;
        bi[0] = "pos";
        a0.cls = 1;
        a0.keys = bi;
        aw[3] = a0;
        a2[0] = "x";
        a2[1] = "y";
        a1.cls = 0;
        a1.keys = a2;
        aw[4] = a1;
        a4[0] = "pos";
        a4[1] = "vel";
        a3.cls = 1;
        a3.keys = a4;
        aw[5] = a3;
        aN.value = a6;
        a7.value = bl;
        aC.value = bk;
        au.value = d;
        e.value = ay;
        e = {};
        ay = {};
        au = __mk7(au, e, aM, ay, aI, aN);
        av = {};
        aC = __mk8(be, bd, av);
        av["0:x"] = 2;
        av["1:pos"] = 3;
        av["2:y"] = 4;
        av["3:vel"] = 5;
        ay.value = aC;
        e.value = au;
        __pc = 12; break;
      }
      case 39: {
        d = hostLoad(at, 0, "pos");
        a = hostShapeOf(d);
        __pc = 40; break;
      }
      case 40: {
        if (!(a === 2)) { __pc = 41; } else { __pc = 42; } break;
      }
      case 41: {
        b = -1;
        __pc = 43; break;
      }
      case 42: {
        b = 0;
        __pc = 43; break;
      }
      case 43: {
        if (!(a === 4)) { __pc = 45; } else { __pc = 44; } break;
      }
      case 44: {
        b = 0;
        __pc = 45; break;
      }
      case 45: {
        if (!(b < 0)) { __pc = 46; } else { __pc = 47; } break;
      }
      case 46: {
        a = b;
        __pc = 54; break;
      }
      case 47: {
        a = hostShapeOf(d);
        __pc = 48; break;
      }
      case 48: {
        if (!(a === 2)) { __pc = 49; } else { __pc = 50; } break;
      }
      case 49: {
        b = -1;
        __pc = 51; break;
      }
      case 50: {
        b = 0;
        __pc = 51; break;
      }
      case 51: {
        if (!(a === 4)) { __pc = 53; } else { __pc = 52; } break;
      }
      case 52: {
        b = 0;
        __pc = 53; break;
      }
      case 53: {
        a = b;
        __pc = 54; break;
      }
      case 54: {
        d = hostLoad(d, a, "x");
        a = hostShapeOf(d);
        __pc = 55; break;
      }
      case 55: {
        c = d;
        d = hostLoad(at, 0, "pos");
        as = a;
        a = hostShapeOf(d);
        __pc = 56; break;
      }
      case 56: {
        if (!(a === 4)) { __pc = 57; } else { __pc = 58; } break;
      }
      case 57: {
        b = -1;
        __pc = 59; break;
      }
      case 58: {
        b = 1;
        __pc = 59; break;
      }
      case 59: {
        if (!(b < 0)) { __pc = 60; } else { __pc = 61; } break;
      }
      case 60: {
        a = b;
        __pc = 66; break;
      }
      case 61: {
        a = hostShapeOf(d);
        __pc = 62; break;
      }
      case 62: {
        if (!(a === 4)) { __pc = 63; } else { __pc = 64; } break;
      }
      case 63: {
        b = -1;
        __pc = 65; break;
      }
      case 64: {
        b = 1;
        __pc = 65; break;
      }
      case 65: {
        a = b;
        __pc = 66; break;
      }
      case 66: {
        d = hostLoad(d, a, "y");
        a = hostShapeOf(d);
        if (!(as === -1 & a === -1)) { __pc = 67; } else { __pc = 68; } break;
      }
      case 67: {
        c = hostArith("+", c, d);
        __pc = 69; break;
      }
      case 68: {
        c += d;
        __pc = 69; break;
      }
      case 69: {
        if (!(as === -1 & a === -1)) { __pc = 70; } else { __pc = 71; } break;
      }
      case 70: {
        hostShapeOf(c);
        __pc = 31; break;
      }
      case 71: {
        __pc = 31; break;
      }
    }
  }
}
