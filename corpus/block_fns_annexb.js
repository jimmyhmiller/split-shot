// inputs: [0, 1]
// Annex B.3.3 block functions in sloppy mode, including over a top-level
// function of the same name and an if-statement body declaration.
function main(n) {
  var out = [];
  function f() { return 1; }
  out.push(f());
  { function f() { return 2; } }
  out.push(f());
  if (n) function z() { return "z"; }
  out.push(typeof z);
  return out.join("|");
}
