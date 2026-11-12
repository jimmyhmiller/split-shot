// style: accumulator machine, recursion over prog.slice(1), conditional-expression dispatch (docs/p3/int.js)
// residue: "(addlit|mullit|addin|subin)"
// The opcode interpreter of the second Futamura projection experiments
// (docs/p3/int.js; docs/p2real/int.js is the same with reduce): each
// instruction updates an accumulator, the program is consumed by recursing on
// its tail. A fixed program is run for every value of the input array.

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
           : unknown(op);
  return run(prog.slice(1), next, x);
}
function unknown(op) {
  throw new Error("unknown instruction " + op);
}

// ((((x + 3) * 2 - x) * 5 + x + 1) * 3 - x) * 7 + 2x - 4, step by step
const PROGRAM = [
  ["addin"], ["addlit", 3], ["mullit", 2], ["subin"],
  ["mullit", 5], ["addin"], ["addlit", 1],
  ["mullit", 3], ["subin"],
  ["mullit", 7], ["addin"], ["addin"], ["addlit", -4],
  ["mullit", 1], ["addlit", 0], ["subin"], ["addin"],
];

export function main(input) {
  return input.xs.map((x) => interp(PROGRAM, x));
}

export const inputs = [
  { xs: [] },
  { xs: [0] },
  { xs: [1, -1] },
  { xs: [0.5, 2.25, -3.75, 1e6] },
  { xs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31] },
  { xs: [-50, -49, -48, -47, -46, -45, -44, -43, -42, -41, -40, -39, -38, -37, -36, -35, -34, -33, -32, -31, -30, -29, -28, -27, -26, -25, -24, -23, -22, -21, -20, -19, -18, -17, -16, -15, -14, -13, -12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49] },
];
