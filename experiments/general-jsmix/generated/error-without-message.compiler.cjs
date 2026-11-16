function compile(b) {
  let a, i, j, k, l, m, n, o, p, c, q, g, s, d, t, e, u, f, v, h, w;
  a = codegen.buffer();
  i = codegen.reference("io");
  j = codegen.call(a, i, "prompt", []);
  k = b[0];
  l = codegen.binary("===", j, k);
  m = codegen.fork(a);
  o = a;
  p = l;
  c = m;
  q = codegen.fork(a);
  try {
    n = new Error();
    codegen.throwValue(c, n);
    g = [true, void 0];
  } catch (r) {
    g = codegen.caught(c, r);
  }
  s = [false, void 0];
  d = Object.create(null);
  t = {value: "io"};
  d.p = {value: b};
  d.io = t;
  e = Object.create(null);
  u = {value: "io"};
  e.p = {value: b};
  e.io = u;
  f = Object.create(null);
  v = {value: "io"};
  f.p = {value: b};
  f.io = v;
  h = codegen.branch(o, p, c, q, g, s, d, e, f);
  if (h[0]) {
    w = h[1];
    return codegen.finish(a, w);
  }
  return codegen.finish(a, "ok");
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
