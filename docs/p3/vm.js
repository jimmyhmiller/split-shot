// The bytecode VM from the first projection, in jsmix2's subset: the dispatch
// loop becomes a recursive `step` on the program counter.
function vm(code, n) {
  return step(code, 0, n, 0);
}
function step(code, pc, n, acc) {
  if (pc >= code.length) { return acc; }
  var ins = code[pc];
  var op = ins[0];
  if (op === "jz") { return n === 0 ? step(code, ins[1], n, acc) : step(code, pc + 1, n, acc); }
  if (op === "add") { return step(code, pc + 1, n, acc + n); }
  if (op === "dec") { return step(code, pc + 1, n - 1, acc); }
  if (op === "jmp") { return step(code, ins[1], n, acc); }
  return acc;
}
