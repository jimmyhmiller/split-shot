// inputs: [0, 2, 7]
// Mutual recursion between top-level functions, a counter closure, and top-level this.
function isEven(n) { return n === 0 ? true : isOdd(n - 1); }
function isOdd(n) { return n === 0 ? false : isEven(n - 1); }
var make = function () { var c = 0; return function () { c = c + 1; return c; }; };
var counter = make();
counter();
function main(n) { return [isEven(n), isOdd(n), counter(), counter.name, make.name]; }
