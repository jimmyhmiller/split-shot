// inputs: [0, 1, 5, -3]
// forbid: next\(|yield|Symbol
function* g(k){ yield k; yield k + 1; }
function f(n){ var t = 0; for (var v of g(n)) t = t + v; return t; }
function main(n){ return f(n); }
