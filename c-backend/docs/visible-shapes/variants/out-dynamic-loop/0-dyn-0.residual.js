function __mk0(h, r, k, s, t) {
  return function execute(j, f, l, m, n, o) {
    let g, c, d, e, i, a, b, p, q;
    g = 0;
    c = l;
    d = m;
    e = n;
    i = o;
    while (g < j.length) {
      a: {
        a = j[g];
        b = a[0];
        if (b === "setprop") {
          b = (0 , h.value)(a[3], f, c, d, e);
          p = k.value;
          q = (0 , t.value)(a[1], f);
          p.call(k, q, a[2], b, c, d, e);
          break a;
        }
        if (b === "setlocal") {
          b = (0 , h.value)(a[2], f, c, d, e);
          c[a[1]] = b;
          d[a[1]] = s.value;
          e[a[1]] = 0;
          break a;
        }
        if (b === "while") {
          while ((0 , h.value)(a[1], f, c, d, e)) {
            (0 , r.value)(a[2], f, c, d, e, i);
          }
          break a;
        }
        if (b === "return") {
          i.result = (0 , h.value)(a[1], f, c, d, e);
          break a;
        }
        (0 , h.value)(a[1], f, c, d, e);
      }
      g += 1;
    }
    return;
  };
}

function __mk1(m, j, o, k, p, q, r, s, l) {
  return function evaluate(c, g, h, i, t) {
    let a, e, b, d, f, n;
    a = c[0];
    e = r;
    if (a === "num") {
      e.value = -1;
      return c[1];
    }
    b = t;
    if (a === "local" || a === "this") {
      a = (0 , l.value)(c, g);
      b[a] = 0;
      e.value = i[a];
      return h[a];
    }
    if (a === "bin") {
      a: {
        a = (0 , j.value)(c[2], g, h, i, b);
        d = e.value;
        b = (0 , j.value)(c[3], g, h, i, b);
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
        a = (0 , l.value)(c[1], g);
        if (a >= 0) {
          b = h[a];
          e = i[a];
          break d;
        }
        a = (0 , j.value)(c[1], g, h, i, b);
        e = e.value;
        b = a;
      }
      return (0 , p.value)(e, b, c[2]);
    }
    if (a === "new") {
      e: {
        a = q.value.classes[c[1]];
        d = o.value[a.ctor + ":" + a.empty];
        f = hostNew(a.empty, d === void 0 ? 0 : (s.value[d]).keys.length);
        hostCall(a.ctor, a.empty, 1, "", f, (0 , m.value)(c[2], g, h, i, b));
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
      a = (0 , l.value)(c[1], g);
      if (a >= 0) {
        f = h[a];
        d = i[a];
        b[a] = 0;
        break f;
      }
      a = (0 , j.value)(c[1], g, h, i, b);
      d = e.value;
      f = a;
    }
    a = (0 , k.value)(d, c[2], 0);
    d = (0 , k.value)(d, c[2], 1);
    if (a < 0) {
      a = hostShapeOf(f);
      d = (0 , k.value)(a, c[2], 0);
      n = (0 , k.value)(a, c[2], 1);
      a = d;
      d = n;
    }
    a = hostCall(a, d, 0, c[2], f, (0 , m.value)(c[3], g, h, i, b));
    e.value = hostShapeOf(a);
    return a;
  };
}

function __mk2(d) {
  return function argumentsOf(c, e, f, g, h) {
    let b, a;
    b = [];
    a = 0;
    while (a < c.length) {
      b[a] = (0 , d.value)(c[a], e, f, g, h);
      a += 1;
    }
    return b;
  };
}

function __mk3(e, d) {
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

function __mk4(c, e) {
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

function __mk5(g, e) {
  return function findSlot(f, d) {
    let b, a, c;
    b = -1;
    a = 0;
    while (a < g.length) {
      c = e(a, d);
      if (c >= 0) {
        if (f === a) {
          b = e(a, d);
        }
        a += 1;
        continue;
      }
      a += 1;
    }
    return b;
  };
}

function __mk6(e) {
  return function slotOf(c, d) {
    let b, a;
    b = (e[c]).keys;
    a = 0;
    while (a < b.length) {
      if (b[a] === d) {
        return a;
      }
      a += 1;
    }
    return -1;
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

function entry(ai) {
  let b, m, f, o, g, j, c, d, e, i, k, a, p, aj, ak, al, N, l, O, D, h, aF, am, an, aG, ao, n, q, r, P, s, ap, Q, t, aq, R, u, ar, S, E, T, v, F, as, G, U, w, H, at, I, V, x, W, y, au, X, z, av, Y, A, aw, B, ax, C, J, ay, az, K, aA, Z, L, aB, M, aC, aa, aH, ab, aI, ac, aD, ad, aE, ae, af, ag, ah;
  b = hostArg(ai, 0);
  m = hostShapeOf(b);
  f = hostThis(ai);
  o = hostShapeOf(f);
  g = hostNew(1, 2);
  j = hostCall;
  c = g;
  d = g;
  g = hostNew(0, 2);
  hostCall(1, 0, 1, "", g, [1, 2]);
  e = g;
  g = hostNew(0, 2);
  hostCall(1, 0, 1, "", g, [b, 3]);
  j(3, 1, 1, "", d, [e, g]);
  g = {value: -1};
  j = ["setlocal", 1, ["new", 1, [["new", 0, [["num", 1], ["num", 2]]], ["new", 0, [["local", 0], ["num", 3]]]]]];
  d = ["setlocal", 2, ["num", 0]];
  e = ["while", ["bin", "<", ["local", 2], ["local", 0]], [["expr", ["call", ["local", 1], "step", []]], ["setlocal", 2, ["bin", "+", ["local", 2], ["num", 1]]]]];
  j = [j, d, e, ["return", ["bin", "+", ["get", ["get", ["local", 1], "pos"], "x"], ["get", ["get", ["local", 1], "pos"], "y"]]]];
  d = {};
  i = {};
  k = __mk2(i);
  a = {};
  p = {};
  aj = {};
  ak = {};
  al = {};
  N = {};
  l = __mk1(d, i, a, p, aj, ak, g, al, N);
  O = {};
  D = {};
  h = [];
  aF = __mk3(D, h);
  am = __mk6(h);
  an = __mk5(h, am);
  aG = __mk4(an, g);
  ao = function variable(a, b) {
  if (a[0] === "this") {
    return b;
  }
  if (a[0] === "local") {
    return a[1];
  }
  return -1;
};
  n = [];
  q = {};
  r = {};
  P = [];
  s = [];
  ap = [];
  Q = [];
  t = [];
  aq = [];
  R = [];
  u = {};
  ar = [];
  S = [];
  E = [];
  T = [];
  v = [];
  F = [];
  as = [];
  G = [];
  U = [];
  w = [];
  H = [];
  at = [];
  I = [];
  V = [];
  x = {};
  W = [];
  y = [];
  au = [];
  X = [];
  z = [];
  av = [];
  Y = [];
  A = {};
  aw = [];
  B = [];
  ax = [];
  C = [];
  J = [];
  ay = [];
  az = [];
  K = [];
  aA = [];
  Z = [];
  L = {};
  aB = {};
  M = {};
  aC = {};
  aa = {};
  aH = [];
  ab = {};
  aI = [];
  ac = {};
  aD = [];
  ad = {};
  aE = [];
  ae = {};
  af = [];
  ag = {};
  ah = [];
  O["1:0"] = 4;
  O["3:1"] = 5;
  a.value = O;
  ak.value = D;
  al.value = h;
  q.name = "main";
  q.params = 1;
  q.locals = 3;
  q.body = j;
  n[0] = q;
  s[0] = "setprop";
  ap[0] = "this";
  s[1] = ap;
  s[2] = "x";
  Q[0] = "local";
  Q[1] = 0;
  s[3] = Q;
  P[0] = s;
  t[0] = "setprop";
  aq[0] = "this";
  t[1] = aq;
  t[2] = "y";
  R[0] = "local";
  R[1] = 1;
  t[3] = R;
  P[1] = t;
  r.name = "Vec";
  r.params = 2;
  r.locals = 2;
  r.body = P;
  n[1] = r;
  S[0] = "return";
  E[0] = "new";
  E[1] = 0;
  v[0] = "bin";
  v[1] = "+";
  F[0] = "get";
  as[0] = "this";
  F[1] = as;
  F[2] = "x";
  v[2] = F;
  G[0] = "get";
  U[0] = "local";
  U[1] = 0;
  G[1] = U;
  G[2] = "x";
  v[3] = G;
  T[0] = v;
  w[0] = "bin";
  w[1] = "+";
  H[0] = "get";
  at[0] = "this";
  H[1] = at;
  H[2] = "y";
  w[2] = H;
  I[0] = "get";
  V[0] = "local";
  V[1] = 0;
  I[1] = V;
  I[2] = "y";
  w[3] = I;
  T[1] = w;
  E[2] = T;
  S[1] = E;
  ar[0] = S;
  u.name = "Vec.add";
  u.params = 1;
  u.locals = 1;
  u.body = ar;
  n[2] = u;
  y[0] = "setprop";
  au[0] = "this";
  y[1] = au;
  y[2] = "pos";
  X[0] = "local";
  X[1] = 0;
  y[3] = X;
  W[0] = y;
  z[0] = "setprop";
  av[0] = "this";
  z[1] = av;
  z[2] = "vel";
  Y[0] = "local";
  Y[1] = 1;
  z[3] = Y;
  W[1] = z;
  x.name = "Ent";
  x.params = 2;
  x.locals = 2;
  x.body = W;
  n[3] = x;
  B[0] = "setprop";
  ax[0] = "this";
  B[1] = ax;
  B[2] = "pos";
  C[0] = "call";
  J[0] = "get";
  ay[0] = "this";
  J[1] = ay;
  J[2] = "pos";
  C[1] = J;
  C[2] = "add";
  K[0] = "get";
  aA[0] = "this";
  K[1] = aA;
  K[2] = "vel";
  az[0] = K;
  C[3] = az;
  B[3] = C;
  aw[0] = B;
  A.name = "Ent.step";
  A.params = 0;
  A.locals = 0;
  A.body = aw;
  n[4] = A;
  aB.add = 2;
  L.ctor = 1;
  L.methods = aB;
  L.empty = 0;
  Z[0] = L;
  aC.step = 4;
  M.ctor = 3;
  M.methods = aC;
  M.empty = 1;
  Z[1] = M;
  D.functions = n;
  D.classes = Z;
  aa.cls = 0;
  aa.keys = aH;
  h[0] = aa;
  ab.cls = 1;
  ab.keys = aI;
  h[1] = ab;
  aD[0] = "x";
  ac.cls = 0;
  ac.keys = aD;
  h[2] = ac;
  aE[0] = "pos";
  ad.cls = 1;
  ad.keys = aE;
  h[3] = ad;
  af[0] = "x";
  af[1] = "y";
  ae.cls = 0;
  ae.keys = af;
  h[4] = ae;
  ah[0] = "pos";
  ah[1] = "vel";
  ag.cls = 1;
  ag.keys = ah;
  h[5] = ag;
  N.value = ao;
  aj.value = aG;
  p.value = aF;
  i.value = l;
  d.value = k;
  d = {};
  k = {};
  i = __mk0(i, d, k, g, N);
  a = {};
  p = __mk8(an, am, a);
  a["0:x"] = 2;
  a["1:pos"] = 3;
  a["2:y"] = 4;
  a["3:vel"] = 5;
  k.value = p;
  d.value = i;
  b = [b, c, 0, f];
  m = [m, 5, -1, o];
  f = [0, 0, 0, 0];
  o = {result: 0};
  while (true) {
    c = l(e[1], 3, b, m, f);
    if (c) {
      i(e[2], 3, b, m, f, o);
      continue;
    }
    d = 3;
    e = m;
    k = o;
    while (d < j.length) {
      a: {
        a = j[d];
        c = a[0];
        if (c === "setprop") {
          c = l(a[3], 3, b, e, f);
          p(ao(a[1], 3), a[2], c, b, e, f);
          break a;
        }
        if (c === "setlocal") {
          c = l(a[2], 3, b, e, f);
          b[a[1]] = c;
          e[a[1]] = g.value;
          f[a[1]] = 0;
          break a;
        }
        if (c === "while") {
          while (true) {
            c = l(a[1], 3, b, e, f);
            if (c) {
              i(a[2], 3, b, e, f, k);
              continue;
            }
            break a;
          }
        }
        if (c === "return") {
          k.result = l(a[1], 3, b, e, f);
          break a;
        }
        l(a[1], 3, b, e, f);
      }
      d += 1;
    }
    hostExit(m[3]);
    return o.result;
  }
}
