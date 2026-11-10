// inputs: [0, 1, 5, -3]
// forbid-return: new |Object\.keys|\.inc\(
function A(v){ this.v = v; } A.prototype.inc = function(){ return this.v + 1; };
function f(n){ var a = new A(n); return a.inc() + Object.keys(a).length; }
function main(n){ return f(n); }
