// inputs: [0, 1, 5, -3]
// forbid: exec|Number\(
function f(n){ var m = /(\d+)-(\d+)/.exec("10-20"); return Number(m[1]) + Number(m[2]) + n; }
function main(n){ return f(n); }
