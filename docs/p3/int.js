// The opcode interpreter from the second projection, written in jsmix2's
// subset: the `reduce` over the program becomes recursion.
function interp(prog, x) {
  return run(prog, 0, x);
}
function run(prog, acc, x) {
  if (prog.length === 0) { return acc; }
  var ins = prog[0];
  var op = ins[0];
  var next = op === "addlit" ? acc + ins[1]
           : op === "mullit" ? acc * ins[1]
           : op === "addin" ? acc + x
           : op === "subin" ? acc - x
           : acc;
  return run(prog.slice(1), next, x);
}
