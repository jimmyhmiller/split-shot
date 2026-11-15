// style: stack VM with call frames (numeric opcodes, CALL pushes {pc, fp} on a frames array, RET pops the return address), fib
const OP_CONST = 0, OP_LOAD = 1, OP_ADD = 3, OP_SUB = 4, OP_LT = 6, OP_JF = 8, OP_CALL = 9, OP_RET = 10;
// fib(n): if (n < 2) return n; return fib(n-1) + fib(n-2)
const CODE = [OP_LOAD, 0, OP_CONST, 2, OP_LT, OP_JF, 10, OP_LOAD, 0, OP_RET,
  OP_LOAD, 0, OP_CONST, 1, OP_SUB, OP_CALL, 0, OP_LOAD, 0, OP_CONST, 2, OP_SUB, OP_CALL, 0, OP_ADD, OP_RET];
function execute(code, arg) {
  const stack = new Array(1024);
  let sp = 0, fp = 0, pc = 0;
  const frames = [];
  stack[sp++] = arg;
  for (;;) {
    const op = code[pc++];
    switch (op) {
      case OP_CONST: stack[sp++] = code[pc++]; break;
      case OP_LOAD: stack[sp++] = stack[fp + code[pc++]]; break;
      case OP_ADD: { const b = stack[--sp]; stack[sp - 1] = stack[sp - 1] + b; break; }
      case OP_SUB: { const b = stack[--sp]; stack[sp - 1] = stack[sp - 1] - b; break; }
      case OP_LT: { const b = stack[--sp]; stack[sp - 1] = stack[sp - 1] < b ? 1 : 0; break; }
      case OP_JF: { const t = code[pc++]; if (stack[--sp] === 0) pc = t; break; }
      case OP_CALL: { const target = code[pc++]; frames.push({ pc, fp }); fp = sp - 1; pc = target; break; }
      case OP_RET: {
        const v = stack[--sp];
        if (frames.length === 0) return v;
        sp = fp;
        ({ pc, fp } = frames.pop());
        stack[sp++] = v;
        break;
      }
      default: throw new Error("bad op " + op);
    }
  }
}
export function main(input) { return execute(CODE, input.n); }
export const inputs = [{ n: 0 }, { n: 1 }, { n: 2 }, { n: 7 }, { n: 15 }, { n: 18 }];
