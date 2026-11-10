// inputs: [0, 1, 2, 3, 4, 7]
// forbid-main: __rf
// A return through finally, and a finally that overrides the return value, in inlined functions.
function f(x){ var log = []; try { log.push("t"); if (x > 1) return log.join("") + "r"; } finally { log.push("f"); } return log.join(""); }
function g(x){ try { return "a"; } finally { if (x > 3) return "fin"; } }
function main(x){ return [f(x), f(0), g(x), g(0)]; }
