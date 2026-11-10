// @case {"description": "A throw that no handler catches still runs enclosing finalizers and then leaves the program.", "inputs": ["0", "1"]}
var trace = "";
function inner(x) {
  try { if (x) throw new Error("escaped"); return trace; } finally { trace = trace + "f"; }
}
function main(x) {
  try { return inner(x) + ":" + trace; } finally { trace = trace + "g"; }
}
