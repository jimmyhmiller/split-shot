// A stack VM running a fixed bytecode program compiles to the program: its
// program counter, read through `prog[pc++]` and set by jumps, is where in
// the program the interpreter is, part of the whistle's point (see
// `Js::dispatch_point`), so dispatch folds; the program's loop under its
// runtime branch is tied at the same instruction met again; the VM's stack
// and memory stay modeled, their values variables of their own.
const PROGRAM = [
  ["OP_PUSH", 0], ["OP_STORE", 0],
  ["OP_PUSH", 0], ["OP_STORE", 1],
  ["OP_LOAD", 1], ["OP_ARG"], ["OP_LT"], ["OP_JZ", 19],
  ["OP_LOAD", 0], ["OP_LOAD", 1], ["OP_LOAD", 1], ["OP_MUL"], ["OP_ADD"], ["OP_STORE", 0],
  ["OP_LOAD", 1], ["OP_PUSH", 1], ["OP_ADD"], ["OP_STORE", 1],
  ["OP_JMP", 4],
  ["OP_LOAD", 0], ["OP_RET"],
];
function run(prog, n) {
  const stack = [];
  const mem = [0, 0];
  let pc = 0;
  for (;;) {
    const ins = prog[pc++];
    switch (ins[0]) {
      case "OP_PUSH": stack.push(ins[1]); break;
      case "OP_STORE": mem[ins[1]] = stack.pop(); break;
      case "OP_LOAD": stack.push(mem[ins[1]]); break;
      case "OP_ARG": stack.push(n); break;
      case "OP_LT": { const b = stack.pop(), a = stack.pop(); stack.push(a < b ? 1 : 0); break; }
      case "OP_ADD": { const b = stack.pop(), a = stack.pop(); stack.push(a + b); break; }
      case "OP_MUL": { const b = stack.pop(), a = stack.pop(); stack.push(a * b); break; }
      case "OP_JZ": if (stack.pop() === 0) pc = ins[1]; break;
      case "OP_JMP": pc = ins[1]; break;
      case "OP_RET": return stack.pop();
      default: throw new Error("bad opcode " + ins[0]);
    }
  }
}
export function main(input) {
  return run(PROGRAM, input | 0);
}
