// inputs: [0, 1, 5, -3, 2.5]
// forbid: Math\.floor|7\.9
function f(n){ return Math.max(n, 4) + Math.floor(7.9) + Math.abs(-n); }
function main(n){ return f(n); }
