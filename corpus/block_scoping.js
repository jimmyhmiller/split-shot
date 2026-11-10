// inputs: [0, 1, 3, 6]
// Block scoping: captured+mutated block lets get a cell per block entry, for-let
// heads a binding per iteration, block function declarations are hoisted to
// their block (and, sloppy, assign a function var: Annex B), switch clauses
// share one scope, push takes any arguments.
function main(n) {
  var out = [];
  // captured+mutated block let
  let r = 0;
  if (n > 0) { let c = 0; const inc = () => { c++; }; inc(); inc(); r = c; }
  out.push(r);
  // per-iteration binding with mutation after capture
  var fs = [];
  for (let i = 0; i < 4; i++) { fs.push(() => i); i += 1; }
  for (let i = 0; i < 3; i++) { let j = i * 10; fs.push(() => j++); }
  out.push(fs.map(f => f()).join(" "));
  // block function declarations, hoisted within the block
  if (n >= 0) {
    var hh = h;
    function h(x) { return x * k; }
    let k = 3;
    out.push(h(4), hh === h);
  }
  // Annex B: the var is assigned when the declaration is evaluated
  out.push(typeof g);
  { function g() { return "g1"; } }
  out.push(g());
  // mutual recursion inside a block
  {
    function ev(x) { return x === 0 ? true : od(x - 1); }
    function od(x) { return x === 0 ? false : ev(x - 1); }
    out.push(ev(n % 7));
  }
  // switch clauses share a scope
  switch (n % 2) {
    case 0: let s = "even"; out.push(s);
    case 1: out.push("c1");
  }
  // closures in a loop body block capturing a mutated let
  var gs = [];
  for (var q = 0; q < 3; q++) { let acc = q; gs.push(() => (acc += 10)); }
  out.push(gs.map(f => f() + f()).join(","));
  return out.join("|");
}
