function compile(program) {
  "use strict";
  let a, result, assigned, h, effects, condition, yesEffects, noEffects, yesResult, f, loaded, b, j, g, right, k, c, l, m, d, n, o, e, p, q, r, s;
  a = codegen.buffer();
  b = codegen.reference("io");
  g = codegen.call(a, b, "prompt", []);
  assigned = g.source;
  b = codegen.reference(assigned);
  right = program[0];
  j = codegen.binary("===", b, right);
  h = codegen.fork(a);
  effects = a;
  condition = j;
  yesEffects = h;
  noEffects = codegen.fork(a);
  try {
    yesResult = [true, codegen.literal("early")];
  } catch (i) {
    yesResult = codegen.caught(yesEffects, i);
  }
  k = [false, void 0];
  c = Object.create(null);
  l = {value: "io"};
  m = {value: assigned};
  c.p = {value: program};
  c.io = l;
  c.value = m;
  d = Object.create(null);
  n = {value: "io"};
  o = {value: assigned};
  d.p = {value: program};
  d.io = n;
  d.value = o;
  e = Object.create(null);
  p = {value: "io"};
  q = {value: assigned};
  e.p = {value: program};
  e.io = p;
  e.value = q;
  f = codegen.branch(effects, condition, yesEffects, noEffects, yesResult, k, c, d, e);
  if (f[0]) {
    result = f[1];
    return codegen.finish(a, result);
  }
  loaded = (c["io"]).value;
  b = codegen.reference(loaded);
  loaded = (c["value"]).value;
  r = b;
  s = [codegen.reference(loaded)];
  g = codegen.call(a, r, "print", s);
  loaded = (c["value"]).value;
  b = codegen.reference(loaded);
  return codegen.finish(a, b);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
