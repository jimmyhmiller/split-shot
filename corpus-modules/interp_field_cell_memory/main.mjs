// A machine whose memory is a field of the machine itself, replaced by a
// larger one when the program grows it. Each call of `main` may leave the
// machine with another memory: that field is runtime state. The machine's
// other fields, the program it runs among them, no call changes. Only the
// field is kept at runtime, in a cell the load code makes
// (`EntrySplit::cells`): the machine stays the load code's object, its
// program known, and the interpreter folds away. Were the machine runtime
// state whole for its one field, the program would be read from it at
// runtime and interpreted.
class Machine {
  constructor(code) {
    this.code = code;
    this.limit = 64;
    this.memory = new Int32Array(4);
  }
  run(arg) {
    const stack = [];
    for (const ins of this.code) {
      switch (ins.op) {
        case "arg": stack.push(arg); break;
        case "const": stack.push(ins.n | 0); break;
        case "add": { const b = stack.pop(), a = stack.pop(); stack.push((a + b) | 0); break; }
        case "and": { const b = stack.pop(), a = stack.pop(); stack.push(a & b); break; }
        case "size": stack.push(this.memory.length); break;
        case "grow": {
          const more = stack.pop();
          const old = this.memory.length;
          if (old + more > this.limit) {
            stack.push(-1);
          } else {
            const next = new Int32Array(old + more);
            next.set(this.memory);
            this.memory = next;
            stack.push(old);
          }
          break;
        }
        case "load": { const at = stack.pop(); stack.push(this.memory[at] | 0); break; }
        case "store": { const v = stack.pop(), at = stack.pop(); this.memory[at] = v; break; }
        default: throw new Error("unknown instruction " + ins.op);
      }
    }
    return stack.pop();
  }
}
const I = (op, n) => ({ op, n });
// m[1] += n; grown = grow(n & 3); return grown + size + m[1]
const MACHINE = new Machine([
  I("const", 1), I("const", 1), I("load"), I("arg"), I("add"), I("store"),
  I("arg"), I("const", 3), I("and"), I("grow"),
  I("size"), I("add"),
  I("const", 1), I("load"), I("add"),
]);
export function main(input) {
  return MACHINE.run(input.n | 0);
}
