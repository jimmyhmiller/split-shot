// A VM whose dispatch is a recursive `step(code, pc, ...)`, one call per
// instruction, under runtime control (`n === 0`): each program point is a
// residual function of its own (see `Js::arg_shapes`), the program and the
// opcodes gone, one call per point as deep as the original's.
const PROGRAM = [["jz", 4], ["add"], ["dec"], ["jmp", 0], ["halt"]];
function step(code, pc, n, acc) {
  if (pc >= code.length) return acc;
  const ins = code[pc];
  const op = ins[0];
  if (op === "jz") return n === 0 ? step(code, ins[1], n, acc) : step(code, pc + 1, n, acc);
  if (op === "add") return step(code, pc + 1, n, acc + n);
  if (op === "dec") return step(code, pc + 1, n - 1, acc);
  if (op === "jmp") return step(code, ins[1], n, acc);
  if (op === "halt") return acc;
  throw new Error("unknown instruction " + op);
}
export function main(input) {
  let n = input | 0;
  if (n < 0) n = 0;
  return step(PROGRAM, 0, n, 0);
}
