function compile(program) {
  "use strict";
  let a, result, f, returned, g, effects, condition, yesEffects, noEffects, yesResult, e, i, j, k, right, l, b, m, c, n, d, o;
  a = codegen.buffer();
  i = codegen.reference("io");
  k = codegen.call(a, i, "prompt", []);
  right = program[0];
  j = codegen.binary("===", k, right);
  g = codegen.fork(a);
  effects = a;
  condition = j;
  yesEffects = g;
  noEffects = codegen.fork(a);
  try {
    returned = null["value"];
    yesResult = [true, codegen.literal(returned)];
  } catch (h) {
    yesResult = codegen.caught(yesEffects, h);
  }
  l = [false, void 0];
  b = Object.create(null);
  m = {value: "io"};
  b.p = {value: program};
  b.io = m;
  c = Object.create(null);
  n = {value: "io"};
  c.p = {value: program};
  c.io = n;
  d = Object.create(null);
  o = {value: "io"};
  d.p = {value: program};
  d.io = o;
  e = codegen.branch(effects, condition, yesEffects, noEffects, yesResult, l, b, c, d);
  if (e[0]) {
    result = e[1];
    return codegen.finish(a, result);
  }
  f = codegen.literal("safe");
  return codegen.finish(a, f);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
