// inputs: [0, 1, 5, -3]
// forbid: Object\.assign|slice
function f(n){ var o = {a:1, b:2}; var p = Object.assign({}, o, {c:n}); var [x, ...rest] = [n, 2, 3]; return JSON.stringify(p) + x + rest.length; }
function main(n){ return f(n); }
