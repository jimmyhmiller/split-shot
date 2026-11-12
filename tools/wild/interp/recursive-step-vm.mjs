// style: accumulator VM whose dispatch loop is a recursive step(pc, ...) function (ported from docs/p3/vm.js)
// residue: "(jz|add|dec|jmp|halt)"
// The bytecode VM of the first projection (docs/p3/vm.js), written in a
// subset without loops: the machine state (pc, the counter n, the
// accumulator) is threaded through a recursive `step`, one call per
// instruction. The fixed program sums n + (n-1) + ... + 1, guarding against
// negative n by clamping first.
const PROGRAM = [
  ["jz", 4],   // 0: if n == 0 goto 4
  ["add"],     // 1: acc += n
  ["dec"],     // 2: n -= 1
  ["jmp", 0],  // 3: goto 0
  ["halt"],    // 4
];

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
  if (op === "halt") { return acc; }
  throw new Error("unknown instruction " + op);
}

export function main(input) {
  var n = input.n | 0;
  if (n < 0) n = 0;
  return vm(PROGRAM, n);
}
export const inputs = [{ n: 0 }, { n: 1 }, { n: 2 }, { n: -3 }, { n: 50 }, { n: 300 }, { n: 1000 }];
