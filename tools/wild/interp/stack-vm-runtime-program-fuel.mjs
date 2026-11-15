// style: stack VM with a step limit whose program is runtime input (nothing static to compile: the residual should cost what the original does)
const OPS = { push: 0, add: 1, mul: 2, dup: 3, swap: 4, jnz: 5, dec: 6, pop: 7, halt: 8 };
function run(code, arg) {
  const st = [arg];
  let pc = 0, steps = 0;
  while (steps++ < 1e6) {
    const op = code[pc++];
    switch (op) {
      case 0: st.push(code[pc++]); break;
      case 1: st.push(st.pop() + st.pop()); break;
      case 2: st.push(st.pop() * st.pop()); break;
      case 3: st.push(st[st.length - 1]); break;
      case 4: { const a = st.pop(), b = st.pop(); st.push(a, b); break; }
      case 5: { const t = code[pc++]; if (st[st.length - 1] !== 0) pc = t; break; }
      case 6: st[st.length - 1]--; break;
      case 7: st.pop(); break;
      case 8: return st;
      default: throw new Error("bad op " + op);
    }
  }
  throw new Error("step limit");
}
export function main(input) { return run(input.code, input.arg); }
export const inputs = [
  { code: [8], arg: 1 },
  { code: [0, 2, 2, 8], arg: 3 },
  { code: [0, 0, 4, 3, 6, 4, 7, 5, 3, 8], arg: 5 },
  { code: [3, 6, 5, 0, 8], arg: 50 },
  { code: [3, 6, 5, 0, 8], arg: 2000 },
  { code: [0, 7, 1, 0, 3, 2, 8], arg: 4 },
];
