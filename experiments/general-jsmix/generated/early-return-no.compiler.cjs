function compile(e) {
  let c, a, i, f, n, o, p, j, q, k, r, l, s, u, b, v, w, g, x, y, h, z, A, m, B, d, C;
  c = codegen.buffer();
  a = codegen.reference("io");
  i = codegen.call(c, a, "prompt", []);
  f = i.source;
  a = codegen.reference(f);
  n = e[0];
  o = codegen.binary("===", a, n);
  p = codegen.fork(c);
  j = c;
  q = o;
  k = p;
  r = codegen.fork(c);
  try {
    l = [true, codegen.literal("early")];
  } catch (t) {
    l = codegen.caught(k, t);
  }
  u = [false, void 0];
  b = Object.create(null);
  v = {value: "io"};
  w = {value: f};
  b.p = {value: e};
  b.io = v;
  b.value = w;
  g = Object.create(null);
  x = {value: "io"};
  y = {value: f};
  g.p = {value: e};
  g.io = x;
  g.value = y;
  h = Object.create(null);
  z = {value: "io"};
  A = {value: f};
  h.p = {value: e};
  h.io = z;
  h.value = A;
  m = codegen.branch(j, q, k, r, l, u, b, g, h);
  if (m[0]) {
    B = m[1];
    return codegen.finish(c, B);
  }
  d = (b["io"]).value;
  a = codegen.reference(d);
  d = (b["value"]).value;
  C = a;
  s = [codegen.reference(d)];
  i = codegen.call(j, C, "print", s);
  d = (b["value"]).value;
  a = codegen.reference(d);
  return codegen.finish(c, a);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
