// inputs: [0, 1, 5, -3]
function f(n){ try { if (n > 3) throw new Error("big"); return n; } catch (e) { return e.message.length; } }
function main(n){ return f(n); }
