function compile(b) {
  let a, i, j, k, l, m, n, o, f, p, q, r, g, t, c, u, d, v, e, w, h, x;
  a = codegen.buffer();
  i = codegen.reference("io");
  j = codegen.call(a, i, "prompt", []);
  k = b[0];
  l = codegen.binary("===", j, k);
  m = codegen.fork(a);
  n = a;
  o = l;
  f = m;
  p = codegen.fork(a);
  try {
    q = null["value"];
    g = [true, codegen.literal(q)];
  } catch (s) {
    g = codegen.caught(f, s);
  }
  t = [false, void 0];
  c = Object.create(null);
  u = {value: "io"};
  c.p = {value: b};
  c.io = u;
  d = Object.create(null);
  v = {value: "io"};
  d.p = {value: b};
  d.io = v;
  e = Object.create(null);
  w = {value: "io"};
  e.p = {value: b};
  e.io = w;
  h = codegen.branch(n, o, f, p, g, t, c, d, e);
  if (h[0]) {
    x = h[1];
    return codegen.finish(a, x);
  }
  r = codegen.literal("safe");
  return codegen.finish(a, r);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
