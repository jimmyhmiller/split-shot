// inputs: [0, 3]
// A script may declare a function twice: the later declaration is the
// binding from the start (it was a "duplicate function" error).
var before = f(1);
function f(x) { return x + 1; }
function f(x) { return x * 10; }
function main(n) { return before + f(n); }
