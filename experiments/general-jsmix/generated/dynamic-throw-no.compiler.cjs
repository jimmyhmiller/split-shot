function compile(program) {
  "use strict";
  let a, result, assigned, i, effects, condition, yesEffects, noEffects, yesResult, g, loaded, b, k, h, right, f, l, c, m, n, d, o, p, e, q, r, s;
  a = codegen.buffer();
  b = codegen.reference("io");
  h = codegen.call(a, b, "prompt", []);
  assigned = h.source;
  b = codegen.reference(assigned);
  right = program[0];
  k = codegen.binary("===", b, right);
  i = codegen.fork(a);
  effects = a;
  condition = k;
  yesEffects = i;
  noEffects = codegen.fork(a);
  try {
    f = new Error("stopped");
    codegen.throwValue(yesEffects, f);
    yesResult = [true, void 0];
  } catch (j) {
    yesResult = codegen.caught(yesEffects, j);
  }
  l = [false, void 0];
  c = Object.create(null);
  m = {value: "io"};
  n = {value: assigned};
  c.p = {value: program};
  c.io = m;
  c.value = n;
  d = Object.create(null);
  o = {value: "io"};
  p = {value: assigned};
  d.p = {value: program};
  d.io = o;
  d.value = p;
  e = Object.create(null);
  q = {value: "io"};
  r = {value: assigned};
  e.p = {value: program};
  e.io = q;
  e.value = r;
  g = codegen.branch(effects, condition, yesEffects, noEffects, yesResult, l, c, d, e);
  if (g[0]) {
    result = g[1];
    return codegen.finish(a, result);
  }
  loaded = (c["io"]).value;
  b = codegen.reference(loaded);
  loaded = (c["value"]).value;
  s = b;
  f = [codegen.reference(loaded)];
  h = codegen.call(a, s, "print", f);
  loaded = (c["value"]).value;
  b = codegen.reference(loaded);
  return codegen.finish(a, b);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
