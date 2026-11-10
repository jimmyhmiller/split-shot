// inputs: [0, 1, 2, 5]
// forbid-return: lookup\(|TABLE\[|ops\.length|new 
// Configuration built by top-level code, then used by main: folds away.
var ops = ["add", "mul", "sub"];
var TABLE = {};
for (var i = 0; i < ops.length; i++) TABLE[ops[i]] = i * 10;
const SCALE = 3;
function lookup(name) { return TABLE[name] * SCALE; }
class Unit { constructor(n) { this.n = n; } scaled() { return this.n * SCALE + lookup("mul"); } }
function main(x) { return new Unit(x).scaled() + lookup("sub"); }
