// style: direct-threaded code (bytecode compiled at load into an array of closures, each returning the next pc)
// residue: "T_[A-Z]+"|\bthreaded\b|\[pc\]\)?\(
// The bytecode of a stack machine is turned, once, into one closure per
// instruction with its operands and its successor captured; running is
// `pc = threaded[pc](frame)` until a closure returns -1. The fixed program
// insertion-sorts a copy of the input array and counts the swaps.
// locals: 0 a, 1 n, 2 i, 3 j, 4 swaps, 5 tmp
const BYTECODE = [
  ["T_ARGCOPY"], ["T_STORE", 0],
  ["T_LOAD", 0], ["T_LEN"], ["T_STORE", 1],
  ["T_PUSH", 0], ["T_STORE", 4],
  ["T_PUSH", 1], ["T_STORE", 2],
  // 9: outer
  ["T_LOAD", 2], ["T_LOAD", 1], ["T_LT"], ["T_JZ", 52],
  ["T_LOAD", 2], ["T_STORE", 3],
  // 15: inner: while (j > 0 && a[j-1] > a[j])
  ["T_LOAD", 3], ["T_PUSH", 0], ["T_GT"], ["T_JZ", 50],
  ["T_LOAD", 0], ["T_LOAD", 3], ["T_PUSH", 1], ["T_SUB"], ["T_ALOAD"],
  ["T_LOAD", 0], ["T_LOAD", 3], ["T_ALOAD"],
  ["T_GT"], ["T_JZ", 50],
  // 29: swap a[j-1] and a[j]
  ["T_LOAD", 0], ["T_LOAD", 3], ["T_ALOAD"], ["T_STORE", 5],
  ["T_LOAD", 0], ["T_LOAD", 3],
  ["T_LOAD", 0], ["T_LOAD", 3], ["T_PUSH", 1], ["T_SUB"], ["T_ALOAD"],
  ["T_ASTORE"],
  ["T_LOAD", 0], ["T_LOAD", 3], ["T_PUSH", 1], ["T_SUB"], ["T_LOAD", 5], ["T_ASTORE"],
  ["T_INC", 4, 1],
  ["T_INC", 3, -1], ["T_JMP", 15],
  // 50: next i
  ["T_INC", 2, 1], ["T_JMP", 9],
  // 52: end
  ["T_LOAD", 0], ["T_LOAD", 4], ["T_RET"],
];

function compile(bytecode) {
  const threaded = new Array(bytecode.length);
  for (let pc = 0; pc < bytecode.length; pc++) {
    const [op, x, y] = bytecode[pc];
    const next = pc + 1;
    switch (op) {
      case "T_PUSH": threaded[pc] = (f) => { f.stack.push(x); return next; }; break;
      case "T_LOAD": threaded[pc] = (f) => { f.stack.push(f.locals[x]); return next; }; break;
      case "T_STORE": threaded[pc] = (f) => { f.locals[x] = f.stack.pop(); return next; }; break;
      case "T_INC": threaded[pc] = (f) => { f.locals[x] += y; return next; }; break;
      case "T_ARGCOPY": threaded[pc] = (f) => { f.stack.push(f.arg.slice()); return next; }; break;
      case "T_LEN": threaded[pc] = (f) => { f.stack.push(f.stack.pop().length); return next; }; break;
      case "T_ALOAD": threaded[pc] = (f) => { const i = f.stack.pop(); f.stack.push(f.stack.pop()[i]); return next; }; break;
      case "T_ASTORE": threaded[pc] = (f) => { const v = f.stack.pop(), i = f.stack.pop(); f.stack.pop()[i] = v; return next; }; break;
      case "T_SUB": threaded[pc] = (f) => { const b = f.stack.pop(); f.stack.push(f.stack.pop() - b); return next; }; break;
      case "T_LT": threaded[pc] = (f) => { const b = f.stack.pop(); f.stack.push(f.stack.pop() < b); return next; }; break;
      case "T_GT": threaded[pc] = (f) => { const b = f.stack.pop(); f.stack.push(f.stack.pop() > b); return next; }; break;
      case "T_JZ": threaded[pc] = (f) => (f.stack.pop() ? next : x); break;
      case "T_JMP": threaded[pc] = () => x; break;
      case "T_RET": threaded[pc] = (f) => { const swaps = f.stack.pop(); f.result = { sorted: f.stack.pop(), swaps }; return -1; }; break;
      default: throw new Error("cannot compile " + op + " at " + pc);
    }
  }
  return threaded;
}

const PROGRAM = compile(BYTECODE);

function run(threaded, arg) {
  const frame = { stack: [], locals: [null, 0, 0, 0, 0, 0], arg, result: undefined };
  let pc = 0;
  while (pc >= 0) pc = threaded[pc](frame);
  return frame.result;
}

export function main(input) {
  return run(PROGRAM, input.xs);
}
export const inputs = [
  { xs: [] },
  { xs: [1] },
  { xs: [2, 1] },
  { xs: [3, 1, 2] },
  { xs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  { xs: [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1] },
  { xs: [37, 4, 91, 15, 62, 8, 73, 29, 50, 11, 84, 3, 66, 42, 19, 97, 25, 58, 70, 1, 33, 88, 46, 12, 79, 54, 6, 95, 21, 68, 40, 17, 83, 9, 61, 30, 75, 2, 49, 90] },
];
