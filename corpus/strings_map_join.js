// inputs: [0, 1, 5, 123, -3]
// forbid: \.map|\.join|split|toUpperCase
function f(n){ var s = "a,b,c".split(",").map(function(t){ return t.toUpperCase(); }).join("-"); return s + ":" + String(n).padStart(3, "0"); }
function main(n){ return f(n); }
