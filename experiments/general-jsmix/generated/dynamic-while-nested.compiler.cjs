function __rf13(env, effects, underDynamic) {
  "use strict";
  let a, b;
  (env["i"]).value = 0;
  a = __rf14(env, effects, underDynamic);
  b = a[0];
  a = a[1];
  if (b) {
    return [b, a];
  }
  return [true, (env["i"]).value];
}

function __rf14(env, effects, underDynamic) {
  "use strict";
  let a, b;
  while ((env["i"]).value < (env["code"]).value["length"]) {
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
  assigned = (env["code"]).value[(env["i"]).value];
  (env["op"]).value = assigned;
  a = __rf17(env, effects, underDynamic);
  b = a[0];
  a = a[1];
  if (b) {
    return [b, a];
  }
  assigned = (env["i"]).value + 1;
  (env["i"]).value = assigned;
  return [false, void 0];
}

function __rf17(env, effects, underDynamic) {
  "use strict";
  let a, loaded, b;
  if ((env["op"]).value === "tick") {
    loaded = (env["io"]).value;
    a = codegen.reference(loaded);
    b = [(env["op"]).value];
    codegen.call(effects, a, "print", b);
    return [false, void 0];
  }
  a = __rf18(env, effects, underDynamic);
  return [a[0], a[1]];
}

function __rf18(env, effects, underDynamic) {
  "use strict";
  let b, i, d, f, g, h, testEffects, condition, bodyEffects, bodyEnv, bodyResult, loaded, c, k, l, parameter, m, e, n, a, o, p, q;
  d = codegen.fork(effects);
  loaded = (env["io"]).value;
  c = codegen.reference(loaded);
  l = codegen.call(d, c, "prompt", []);
  k = codegen.binary("!==", l, "stop");
  f = codegen.fork(effects);
  b = Object.keys(env);
  i = 0;
  e = Object.create(null);
  while (i < b.length) {
    e[b[i]] = {value: (env[b[i]]).value};
    i += 1;
  }
  h = effects;
  testEffects = d;
  condition = k;
  bodyEffects = f;
  bodyEnv = e;
  try {
    n = (bodyEnv["op"]).value;
    loaded = (bodyEnv["io"]).value;
    c = codegen.reference(loaded);
    parameter = c.source;
    a = Object.create(null);
    o = {value: n};
    p = {value: parameter};
    m = {value: void 0};
    q = {value: void 0};
    a.code = o;
    a.io = p;
    a.i = m;
    a.op = q;
    __rf13(a, bodyEffects, true)[1];
    bodyResult = [false, void 0];
  } catch (j) {
    g = codegen.caught(bodyEffects, j);
    bodyResult = g;
  }
  codegen.loop(h, testEffects, condition, bodyEffects, bodyResult, [], []);
  return [false, void 0];
}

function compile(program) {
  "use strict";
  let b, assigned, f, effects, testEffects, condition, bodyEffects, bodyResult, a, g, parameter, h, c, e, d, j, k, l, m;
  b = codegen.buffer();
  a = codegen.reference("io");
  c = 0;
  e = a.source;
  while (c < program["length"]) {
    a: {
      assigned = program[c];
      if (assigned === "tick") {
        a = codegen.reference(e);
        g = codegen.call(b, a, "print", [assigned]);
        break a;
      }
      f = codegen.fork(b);
      a = codegen.reference(e);
      g = codegen.call(f, a, "prompt", []);
      effects = b;
      testEffects = f;
      condition = codegen.binary("!==", g, "stop");
      bodyEffects = codegen.fork(b);
      try {
        a = codegen.reference(e);
        parameter = a.source;
        d = Object.create(null);
        j = {value: assigned};
        k = {value: parameter};
        l = {value: void 0};
        m = {value: void 0};
        d.code = j;
        d.io = k;
        d.i = l;
        d.op = m;
        h = __rf13(d, bodyEffects, true);
        h[0];
        h[1];
        bodyResult = [false, void 0];
      } catch (i) {
        bodyResult = codegen.caught(bodyEffects, i);
      }
      codegen.loop(effects, testEffects, condition, bodyEffects, bodyResult, [], []);
    }
    c += 1;
  }
  return codegen.finish(b, c);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
