// inputs: [0, 1, 2]
// A generator with a try/finally around a yield: a consumer's return() (also
// what for..of does on break) runs the finally, so the region stays a native
// try/finally in the residual generator.
function main(n) {
  var log = [];
  function* g(limit) {
    try {
      for (var i = 0; i < limit; i++) yield i;
      return "end";
    } catch (e) {
      log.push("caught " + e);
      yield "after catch";
    } finally {
      log.push("finally " + limit);
    }
    yield "tail";
  }
  var a = [];
  for (var v of g(5)) { if (v >= n) break; a.push(v); }
  var it = g(3);
  it.next();
  if (n > 0) a.push(it.throw("boom").value);
  a.push(JSON.stringify(it.return(42)), JSON.stringify(it.next()));
  var all = [];
  for (var w of g(n)) all.push(w);
  return [a.join(","), all.join(","), log.join("|")].join(" ; ");
}
