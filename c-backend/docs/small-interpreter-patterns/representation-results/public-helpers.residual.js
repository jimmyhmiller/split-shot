var expr, stmt;

var __rf1 = {stmt: function(c, d) {
  let a, b;
  a = c[0];
  b = d;
  if (a === 1) {
    b[c[1]] = expr(c[2], b);
    return;
  }
  if (a === 2) {
    while (expr(c[1], b)) {
      b[1] = b[1];
      stmt(c[2], b);
    }
    return;
  }
  if (a === 3) {
    a = 0;
    while (a < (c[1]).length) {
      stmt(c[1][a], b);
      a += 1;
    }
  }
}}.stmt;

function entry(b) {
  let a, c, d, e;
  a = {expr: function(a, b) {
  let c;
  c = a[0];
  if (c === 0) {
    return a[1];
  }
  if (c === 1) {
    return b[a[1]];
  }
  if (c === 2) {
    return expr(a[1], b) + expr(a[2], b);
  }
  if (c === 4) {
    return expr(a[1], b) < expr(a[2], b);
  }
}}.expr;
  if (0 < b) {
    expr = a;
    a = __rf1;
    stmt = a;
    a = [b, 1, 0];
    c = a;
    d = [4, [1, 1], [1, 0]];
    e = [3, [[1, 2, [2, [1, 2], [1, 1]]], [1, 1, [2, [1, 1], [0, 1]]]]];
    while (expr(d, a)) {
      a[1] = a[1];
      stmt(e, a);
    }
    return c[2];
  }
  expr = a;
  a = __rf1;
  stmt = a;
  return 0;
}
