// inputs: [0, 3, 10]
// A function whose direct `eval` comes after guards that only read (and
// return when they hold) is specialized like any other; when a call reaches
// the `eval`, nothing it did shows, so the call is made again at runtime as
// the function's own source, with the same `this` and arguments (the
// evaluated code sees its parameters).
function abstract(t, n) {
  if (global.__abstract) return __abstract(t, n);
  if (t === "zero") return 0;
  return eval(n);
}
function main(k) {
  var x = abstract("number", k + " * 2");
  var y = abstract("string", "'s:' + typeof t + ':' + n.length");
  var z = abstract("zero", "throw new Error('not reached')");
  var w;
  try {
    w = abstract("bad", "(");
  } catch (e) {
    w = e instanceof SyntaxError;
  }
  return [x, y, z, w, typeof abstract].join(",");
}
