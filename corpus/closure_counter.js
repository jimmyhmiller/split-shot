// inputs: [0, 1, 5, -3]
// forbid: function __rf
function mk(k){ var c = 0; return function(x){ c = c + k; return x * c; }; }
function f(n){ var g = mk(2); g(1); return g(n); }
function main(n){ return f(n); }
