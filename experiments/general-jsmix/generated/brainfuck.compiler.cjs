function __rf13(env, effects, underDynamic) {
  "use strict";
  let loaded, a, b;
  loaded = (env["from"]).value;
  (env["pc"]).value = loaded;
  a = __rf14(env, effects, underDynamic);
  b = a[0];
  a = a[1];
  if (b) {
    return [b, a];
  }
  loaded = (env["ptr"]).value;
  return [true, codegen.reference(loaded)];
}

function __rf14(env, effects, underDynamic) {
  "use strict";
  let a, b;
  while ((env["pc"]).value < (env["to"]).value) {
    a = __rf15(env, effects, underDynamic);
    b = a[0];
    a = a[1];
    if (b) {
      return [b, a];
    }
  }
  return [false, void 0];
}

function __rf15(env, effects, underDynamic) {
  "use strict";
  let a;
  a = __rf16(env, effects, underDynamic);
  return [a[0], a[1]];
}

function __rf16(env, effects, underDynamic) {
  "use strict";
  let assigned, a, b;
  assigned = (env["program"]).value[(env["pc"]).value];
  (env["c"]).value = assigned;
  a = __rf17(env, effects, underDynamic);
  b = a[0];
  a = a[1];
  if (b) {
    return [b, a];
  }
  assigned = (env["pc"]).value + 1;
  (env["pc"]).value = assigned;
  return [false, void 0];
}

function __rf17(env, effects, underDynamic) {
  "use strict";
  let a, loaded, b, assigned, c;
  if ((env["c"]).value === "+") {
    loaded = (env["io"]).value;
    a = codegen.reference(loaded);
    loaded = (env["ptr"]).value;
    b = a;
    a = codegen.reference(loaded);
    a = codegen.call(effects, b, "load", [a]);
    a = codegen.binary("+", a, 1);
    assigned = codegen.bindExpression(effects, a).source;
    (env["cell"]).value = assigned;
    loaded = (env["io"]).value;
    a = codegen.reference(loaded);
    loaded = (env["ptr"]).value;
    b = a;
    a = codegen.reference(loaded);
    loaded = (env["cell"]).value;
    c = a;
    a = codegen.reference(loaded);
    codegen.call(effects, b, "store", [c, a]);
    return [false, void 0];
  }
  a = __rf18(env, effects, underDynamic);
  return [a[0], a[1]];
}

function __rf18(env, effects, underDynamic) {
  "use strict";
  let a, loaded, b, assigned, c;
  if ((env["c"]).value === "-") {
    loaded = (env["io"]).value;
    a = codegen.reference(loaded);
    loaded = (env["ptr"]).value;
    b = a;
    a = codegen.reference(loaded);
    a = codegen.call(effects, b, "load", [a]);
    a = codegen.binary("-", a, 1);
    assigned = codegen.bindExpression(effects, a).source;
    (env["cell"]).value = assigned;
    loaded = (env["io"]).value;
    a = codegen.reference(loaded);
    loaded = (env["ptr"]).value;
    b = a;
    a = codegen.reference(loaded);
    loaded = (env["cell"]).value;
    c = a;
    a = codegen.reference(loaded);
    codegen.call(effects, b, "store", [c, a]);
    return [false, void 0];
  }
  a = __rf19(env, effects, underDynamic);
  return [a[0], a[1]];
}

function __rf19(env, effects, underDynamic) {
  "use strict";
  let a, loaded, assigned;
  if ((env["c"]).value === ">") {
    loaded = (env["ptr"]).value;
    a = codegen.reference(loaded);
    a = codegen.binary("+", a, 1);
    assigned = codegen.bindExpression(effects, a).source;
    (env["ptr"]).value = assigned;
    return [false, void 0];
  }
  a = __rf20(env, effects, underDynamic);
  return [a[0], a[1]];
}

function __rf20(env, effects, underDynamic) {
  "use strict";
  let a, loaded, assigned;
  if ((env["c"]).value === "<") {
    loaded = (env["ptr"]).value;
    a = codegen.reference(loaded);
    a = codegen.binary("-", a, 1);
    assigned = codegen.bindExpression(effects, a).source;
    (env["ptr"]).value = assigned;
    return [false, void 0];
  }
  a = __rf21(env, effects, underDynamic);
  return [a[0], a[1]];
}

function __rf21(env, effects, underDynamic) {
  "use strict";
  let a, loaded, b, assigned;
  if ((env["c"]).value === ".") {
    loaded = (env["io"]).value;
    a = codegen.reference(loaded);
    loaded = (env["ptr"]).value;
    b = a;
    a = codegen.reference(loaded);
    assigned = codegen.call(effects, b, "load", [a]).source;
    (env["cell"]).value = assigned;
    loaded = (env["io"]).value;
    a = codegen.reference(loaded);
    loaded = (env["cell"]).value;
    b = a;
    a = codegen.reference(loaded);
    codegen.call(effects, b, "write", [a]);
    return [false, void 0];
  }
  a = __rf22(env, effects, underDynamic);
  return [a[0], a[1]];
}

function __rf22(env, effects, underDynamic) {
  "use strict";
  let a, loaded, assigned, b, c;
  if ((env["c"]).value === ",") {
    loaded = (env["io"]).value;
    a = codegen.reference(loaded);
    assigned = codegen.call(effects, a, "read", []).source;
    (env["cell"]).value = assigned;
    loaded = (env["io"]).value;
    a = codegen.reference(loaded);
    loaded = (env["ptr"]).value;
    b = a;
    a = codegen.reference(loaded);
    loaded = (env["cell"]).value;
    c = a;
    a = codegen.reference(loaded);
    codegen.call(effects, b, "store", [c, a]);
    return [false, void 0];
  }
  a = __rf23(env, effects, underDynamic);
  return [a[0], a[1]];
}

function __rf23(env, effects, underDynamic) {
  "use strict";
  let a;
  if ((env["c"]).value === "[") {
    a = __rf24(env, effects, underDynamic);
    return [a[0], a[1]];
  }
  return [false, void 0];
}

function __rf24(env, effects, underDynamic) {
  "use strict";
  let a;
  a = __rf25(env, effects, underDynamic);
  return [a[0], a[1]];
}

function __rf25(env, effects, underDynamic) {
  "use strict";
  let loaded, a, assigned, b, value, returned;
  loaded = (env["program"]).value;
  a = loaded;
  loaded = (env["pc"]).value;
  assigned = loaded + 1;
  b = 1;
  while (true) {
    a: {
      if (b > 0) {
        if (assigned >= a["length"]) {
          value = "Unmatched [ at " + loaded;
          a = new Error(value);
          if (underDynamic ? underDynamic : false) {
            codegen.throwValue(effects, a);
            (env["close"]).value = void 0;
            break a;
          }
          throw a;
        }
        if (a[assigned] === "[") {
          b += 1;
        }
        if (a[assigned] === "]") {
          b -= 1;
        }
        assigned += 1;
        continue;
      }
      returned = assigned - 1;
      (env["close"]).value = returned;
    }
    a = __rf26(env, effects, underDynamic);
    b = a[0];
    a = a[1];
    if (b) {
      return [b, a];
    }
    loaded = (env["close"]).value;
    (env["pc"]).value = loaded;
    return [false, void 0];
  }
}

function __rf26(env, effects, underDynamic) {
  "use strict";
  let assigned, c, i, g, d, e, h, j, k, testEffects, condition, bodyEffects, bodyEnv, bodyResult, loaded, b, m, n, actualArg, parameter, o, p, q, r, f, s, t, u, v, w, a, x, y, z, A, B, C, D, E, F;
  o = codegen;
  p = codegen.carry;
  g = codegen.reference((env["ptr"]).value);
  d = p.call(o, effects, g);
  (env["ptr"]).value = d;
  e = codegen.fork(effects);
  loaded = (env["io"]).value;
  b = codegen.reference(loaded);
  loaded = (env["ptr"]).value;
  r = b;
  b = codegen.reference(loaded);
  n = codegen.call(e, r, "load", [b]);
  m = codegen.binary("!==", n, 0);
  h = codegen.fork(effects);
  c = Object.keys(env);
  i = 0;
  f = Object.create(null);
  while (i < c.length) {
    f[c[i]] = {value: (env[c[i]]).value};
    i += 1;
  }
  k = effects;
  testEffects = e;
  condition = m;
  bodyEffects = h;
  bodyEnv = f;
  try {
    t = (bodyEnv["program"]).value;
    actualArg = (bodyEnv["pc"]).value + 1;
    u = (bodyEnv["close"]).value;
    loaded = (bodyEnv["ptr"]).value;
    b = codegen.reference(loaded);
    loaded = (bodyEnv["io"]).value;
    v = b;
    b = codegen.reference(loaded);
    w = v.source;
    parameter = b.source;
    a = Object.create(null);
    x = {value: t};
    y = {value: actualArg};
    q = {value: u};
    z = {value: w};
    A = {value: parameter};
    B = {value: void 0};
    C = {value: void 0};
    D = {value: "undefined"};
    E = {value: void 0};
    a.program = x;
    a.from = y;
    a.to = q;
    a.ptr = z;
    a.io = A;
    a.pc = B;
    a.c = C;
    a.cell = D;
    a.close = E;
    assigned = __rf13(a, bodyEffects, true)[1];
    assigned = codegen.bindExpression(bodyEffects, assigned).source;
    (bodyEnv["ptr"]).value = assigned;
    bodyResult = [false, void 0];
  } catch (l) {
    j = codegen.caught(bodyEffects, l);
    bodyResult = j;
  }
  F = [d];
  s = [(bodyEnv["ptr"]).value];
  codegen.loop(k, testEffects, condition, bodyEffects, bodyResult, F, s);
  a = [false, void 0];
  return a;
}

function compile(program) {
  "use strict";
  let b, g, assigned, s, l, q, effects, testEffects, condition, bodyEffects, bodyResult, loaded, a, i, c, actualArg, parameter, r, u, v, h, w, x, d, m, y, j, k, z, A, B, n, C, e, o, D, p, E, F, f, G, H, I, J, K, L, M, N, O, P, Q;
  b = codegen.buffer();
  actualArg = program["length"];
  a = codegen.reference("io");
  h = 0;
  d = codegen.literal(0).source;
  e = a.source;
  o = void 0;
  while (h < actualArg) {
    a: {
      assigned = program[h];
      if (assigned === "+") {
        a = codegen.reference(e);
        u = a;
        a = codegen.reference(d);
        c = codegen.call(b, u, "load", [a]);
        i = codegen.binary("+", c, 1);
        g = codegen.bindExpression(b, i);
        assigned = g.source;
        a = codegen.reference(e);
        v = a;
        a = codegen.reference(d);
        D = a;
        a = codegen.reference(assigned);
        c = codegen.call(b, v, "store", [D, a]);
        break a;
      }
      if (assigned === "-") {
        a = codegen.reference(e);
        w = a;
        a = codegen.reference(d);
        c = codegen.call(b, w, "load", [a]);
        i = codegen.binary("-", c, 1);
        g = codegen.bindExpression(b, i);
        assigned = g.source;
        a = codegen.reference(e);
        x = a;
        a = codegen.reference(d);
        p = a;
        a = codegen.reference(assigned);
        c = codegen.call(b, x, "store", [p, a]);
        break a;
      }
      if (assigned === ">") {
        a = codegen.reference(d);
        i = codegen.binary("+", a, 1);
        g = codegen.bindExpression(b, i);
        assigned = g.source;
        d = assigned;
        break a;
      }
      if (assigned === "<") {
        a = codegen.reference(d);
        i = codegen.binary("-", a, 1);
        g = codegen.bindExpression(b, i);
        assigned = g.source;
        d = assigned;
        break a;
      }
      if (assigned === ".") {
        a = codegen.reference(e);
        m = a;
        a = codegen.reference(d);
        c = codegen.call(b, m, "load", [a]);
        assigned = c.source;
        a = codegen.reference(e);
        m = a;
        a = codegen.reference(assigned);
        c = codegen.call(b, m, "write", [a]);
        break a;
      }
      if (assigned === ",") {
        a = codegen.reference(e);
        c = codegen.call(b, a, "read", []);
        assigned = c.source;
        a = codegen.reference(e);
        y = a;
        a = codegen.reference(d);
        p = a;
        a = codegen.reference(assigned);
        c = codegen.call(b, y, "store", [p, a]);
        break a;
      }
      if (assigned === "[") {
        k = 1;
        j = h + 1;
        while (k > 0) {
          if (j >= program["length"]) {
            throw new Error("Unmatched [ at " + h);
          }
          if (program[j] === "[") {
            k += 1;
          }
          if (program[j] === "]") {
            k -= 1;
          }
          j += 1;
        }
        o = j - 1;
        z = codegen;
        A = codegen.carry;
        s = codegen.reference(d);
        l = A.call(z, b, s);
        q = codegen.fork(b);
        a = codegen.reference(e);
        B = a;
        a = codegen.reference(l);
        c = codegen.call(q, B, "load", [a]);
        n = {value: l};
        effects = b;
        testEffects = q;
        condition = codegen.binary("!==", c, 0);
        bodyEffects = codegen.fork(b);
        try {
          loaded = n.value;
          a = codegen.reference(loaded);
          E = a;
          a = codegen.reference(e);
          F = E.source;
          parameter = a.source;
          f = Object.create(null);
          G = {value: program};
          H = {value: h + 1};
          I = {value: o};
          J = {value: F};
          K = {value: parameter};
          L = {value: void 0};
          M = {value: void 0};
          N = {value: "undefined"};
          O = {value: void 0};
          f.program = G;
          f.from = H;
          f.to = I;
          f.ptr = J;
          f.io = K;
          f.pc = L;
          f.c = M;
          f.cell = N;
          f.close = O;
          r = __rf13(f, bodyEffects, true);
          r[0];
          C = r[1];
          g = codegen.bindExpression(bodyEffects, C);
          assigned = g.source;
          n.value = assigned;
          bodyResult = [false, void 0];
        } catch (t) {
          bodyResult = codegen.caught(bodyEffects, t);
        }
        P = [l];
        Q = [n.value];
        codegen.loop(effects, testEffects, condition, bodyEffects, bodyResult, P, Q);
        h = o;
        d = l;
      }
    }
    h += 1;
  }
  a = codegen.reference(d);
  return codegen.finish(b, a);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
