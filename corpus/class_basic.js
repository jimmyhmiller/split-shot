// inputs: [0, 1, 5, -3]
// forbid-return: new |\.add\(|\.dbl\b
class P { constructor(x){ this.x = x; } get dbl(){ return this.x * 2; } add(o){ return new P(this.x + o.x); } }
function f(n){ return new P(n).add(new P(3)).dbl; }
function main(n){ return f(n); }
