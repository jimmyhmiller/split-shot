// @case {"description": "try, catch and finally: thrown values and runtime errors are caught, finally runs on every exit, return, break and continue pass through protected blocks, a finalizer's own exit wins, and handlers nest and rethrow."}
function thrower(v) { if (v > 1) throw "big:" + v; return v; }
function basic(x) {
  var log = "";
  try { log = log + "a"; thrower(x); log = log + "b"; }
  catch (e) { log = log + "c[" + e + "]"; }
  finally { log = log + "f"; }
  return log;
}
function returns(x) {
  var seen = 0;
  try { if (x === 0) return "from-try"; seen = 1; throw x; }
  catch (e) { if (e === 1) return "from-catch"; seen = 2; }
  finally { if (x === 3) return "from-finally"; }
  return "after:" + seen;
}
function loops(x) {
  var out = "";
  for (var i = 0; i < 5; i = i + 1) {
    try {
      if (i === 1) continue;
      if (i === 3) break;
      out = out + i;
    } finally { out = out + "."; }
  }
  var j = 0;
  while (true) { try { j = j + 1; if (j > x) break; } catch (e) { out = out + "!"; } }
  return out + j;
}
function runtime(x) {
  var kinds = "";
  try { null.field; } catch (e) { kinds = kinds + e.name + ";"; }
  try { var f = x; f(); } catch (e) { kinds = kinds + e.name + ";"; }
  try { new Array(-1); } catch (e) { kinds = kinds + e.name + ";"; }
  try { throw new RangeError("mine"); } catch (e) { kinds = kinds + e.name + ":" + e.message; }
  return kinds;
}
function nested(x) {
  var log = "";
  try {
    try { thrower(x + 2); } catch (inner) { log = log + "i"; throw inner + "!"; } finally { log = log + "F"; }
  } catch (outer) { log = log + "o[" + outer + "]"; }
  try { try { log = log + "t"; } finally { log = log + "G"; } } catch { log = log + "never"; }
  return log;
}
function closure(x) {
  var make;
  try { var captured = x * 2; make = () => captured + this.bonus; } finally { captured = captured + 1; }
  return make.call({ bonus: 0 }) + this.bonus;
}
function finallyThrows() {
  try { try { return 1; } finally { throw "replaced"; } } catch (e) { return e; }
}
function main(x) {
  return [basic(x), returns(x), loops(x), runtime(x), nested(x), closure.call({ bonus: 100 }, x), finallyThrows()];
}
