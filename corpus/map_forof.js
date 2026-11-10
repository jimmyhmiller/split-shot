// inputs: [0, 1, 5, -3]
// forbid: Map|next\(|Symbol
function f(n){ var m = new Map(); m.set("a", 1); m.set("b", n); var t = 0; for (var [k, v] of m) t = t + v; return t; }
function main(n){ return f(n); }
