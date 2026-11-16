function compile(program) {
  "use strict";
  let b, result, assigned, k, effects, condition, yesEffects, noEffects, yesResult, noResult, g, loaded, a, n, f, right, h, i, o, p, j, c, q, r, d, s, e, t;
  b = codegen.buffer();
  a = codegen.reference("io");
  f = codegen.call(b, a, "prompt", []);
  assigned = f.source;
  a = codegen.reference(assigned);
  right = program[0];
  n = codegen.binary("===", a, right);
  k = codegen.fork(b);
  i = {value: assigned};
  effects = b;
  condition = n;
  yesEffects = k;
  noEffects = codegen.fork(b);
  o = assigned;
  p = assigned;
  try {
    a = codegen.reference("io");
    h = ["yes"];
    f = codegen.call(yesEffects, a, "print", h);
    assigned = codegen.literal("accepted").source;
    i.value = assigned;
    yesResult = [false, void 0];
  } catch (l) {
    yesResult = codegen.caught(yesEffects, l);
  }
  j = {value: p};
  h = [false, void 0];
  try {
    a = codegen.reference("io");
    f = codegen.call(noEffects, a, "print", ["no"]);
    assigned = codegen.literal("rejected").source;
    j.value = assigned;
    noResult = [false, void 0];
  } catch (m) {
    noResult = codegen.caught(noEffects, m);
  }
  c = Object.create(null);
  q = {value: "io"};
  r = {value: o};
  c.p = {value: program};
  c.io = q;
  c.value = r;
  d = Object.create(null);
  s = {value: "io"};
  d.p = {value: program};
  d.io = s;
  d.value = i;
  e = Object.create(null);
  t = {value: "io"};
  e.p = {value: program};
  e.io = t;
  e.value = j;
  g = codegen.branch(effects, condition, yesEffects, noEffects, yesResult, noResult, c, d, e);
  if (g[0]) {
    result = g[1];
    return codegen.finish(b, result);
  }
  loaded = (c["value"]).value;
  a = codegen.reference(loaded);
  return codegen.finish(b, a);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
