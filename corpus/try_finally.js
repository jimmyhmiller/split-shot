// inputs: [0, 1, 2, 5]
// try/finally: the finally code runs on every exit (normal, return, throw,
// break, continue) and can override the completion.
function f1(n) { var log = []; try { log.push("t"); if (n > 1) return log.concat("r"); } finally { log.push("f"); } log.push("after"); return log; }
function f2(n) { try { return "try"; } finally { if (n === 2) return "fin"; } }
function f3(n) { var log = []; for (var i = 0; i < 4; i++) { try { if (i === n) break; if (i % 2) continue; log.push(i); } finally { log.push("f" + i); } } return log; }
function f4(n) { var log = []; try { try { if (n) throw new Error("x" + n); log.push("ok"); } finally { log.push("inner"); } } catch (e) { log.push(e.message); } finally { log.push("outer"); } return log; }
function f5(n) { var k = 0; outer: for (var i = 0; i < 3; i++) { for (var j = 0; j < 3; j++) { try { if (j === n) continue outer; k += 10; } finally { k += 1; } } } return k; }
function main(n) { return [f1(n), f2(n), f3(n), f4(n), f5(n)]; }
