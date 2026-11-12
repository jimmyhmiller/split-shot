// style: stack VM (numeric opcodes with operands inline in an Int32Array, switch dispatch, code[pc++])
// residue: \b(OP_[A-Z]+|opcode)\b
// A stack machine whose bytecode is one flat Int32Array, emitted at load by a
// small code builder with labels, running a fixed program: count the primes
// below n by trial division.
const OP_HALT = 0;
const OP_PUSH = 1;   // imm
const OP_LOAD = 2;   // slot
const OP_STORE = 3;  // slot
const OP_INC = 4;    // slot, imm
const OP_ADD = 5;
const OP_SUB = 6;
const OP_MUL = 7;
const OP_MOD = 8;
const OP_LT = 9;
const OP_LE = 10;
const OP_JMP = 11;   // target
const OP_JZ = 12;    // target
const OP_JNZ = 13;   // target
const OP_ARG = 14;
const OP_DUP = 15;
const OP_POP = 16;

class CodeBuilder {
  constructor() {
    this.words = [];
    this.labels = new Map();
    this.fixups = [];
  }
  emit(op, ...operands) {
    this.words.push(op, ...operands);
    return this;
  }
  jump(op, label) {
    this.words.push(op, -1);
    this.fixups.push({ at: this.words.length - 1, label });
    return this;
  }
  label(name) {
    this.labels.set(name, this.words.length);
    return this;
  }
  finish() {
    for (const { at, label } of this.fixups) {
      const target = this.labels.get(label);
      if (target === undefined) throw new Error("undefined label " + label);
      this.words[at] = target;
    }
    return Int32Array.from(this.words);
  }
}

// slots: 0 count, 1 i, 2 d, 3 isPrime, 4 n
const b = new CodeBuilder();
b.emit(OP_ARG).emit(OP_STORE, 4)
  .emit(OP_PUSH, 0).emit(OP_STORE, 0)
  .emit(OP_PUSH, 2).emit(OP_STORE, 1)
  .label("outer")
  .emit(OP_LOAD, 1).emit(OP_LOAD, 4).emit(OP_LT).jump(OP_JZ, "end")
  .emit(OP_PUSH, 1).emit(OP_STORE, 3)
  .emit(OP_PUSH, 2).emit(OP_STORE, 2)
  .label("inner")
  .emit(OP_LOAD, 2).emit(OP_DUP).emit(OP_MUL).emit(OP_LOAD, 1).emit(OP_LE).jump(OP_JZ, "innerEnd")
  .emit(OP_LOAD, 1).emit(OP_LOAD, 2).emit(OP_MOD).jump(OP_JNZ, "nextD")
  .emit(OP_PUSH, 0).emit(OP_STORE, 3).jump(OP_JMP, "innerEnd")
  .label("nextD")
  .emit(OP_INC, 2, 1).jump(OP_JMP, "inner")
  .label("innerEnd")
  .emit(OP_LOAD, 3).jump(OP_JZ, "skip")
  .emit(OP_INC, 0, 1)
  .label("skip")
  .emit(OP_INC, 1, 1).jump(OP_JMP, "outer")
  .label("end")
  .emit(OP_LOAD, 0).emit(OP_HALT);
const CODE = b.finish();

function execute(code, arg) {
  const stack = new Int32Array(64);
  const slots = new Int32Array(16);
  let sp = 0;
  let pc = 0;
  for (;;) {
    const opcode = code[pc++];
    switch (opcode) {
      case OP_HALT: return stack[sp - 1];
      case OP_PUSH: stack[sp++] = code[pc++]; break;
      case OP_LOAD: stack[sp++] = slots[code[pc++]]; break;
      case OP_STORE: slots[code[pc++]] = stack[--sp]; break;
      case OP_INC: { const s = code[pc++]; slots[s] += code[pc++]; break; }
      case OP_ADD: sp--; stack[sp - 1] = stack[sp - 1] + stack[sp]; break;
      case OP_SUB: sp--; stack[sp - 1] = stack[sp - 1] - stack[sp]; break;
      case OP_MUL: sp--; stack[sp - 1] = Math.imul(stack[sp - 1], stack[sp]); break;
      case OP_MOD: sp--; stack[sp - 1] = stack[sp - 1] % stack[sp]; break;
      case OP_LT: sp--; stack[sp - 1] = stack[sp - 1] < stack[sp] ? 1 : 0; break;
      case OP_LE: sp--; stack[sp - 1] = stack[sp - 1] <= stack[sp] ? 1 : 0; break;
      case OP_JMP: pc = code[pc]; break;
      case OP_JZ: { const t = code[pc++]; if (stack[--sp] === 0) pc = t; break; }
      case OP_JNZ: { const t = code[pc++]; if (stack[--sp] !== 0) pc = t; break; }
      case OP_ARG: stack[sp++] = arg; break;
      case OP_DUP: stack[sp] = stack[sp - 1]; sp++; break;
      case OP_POP: sp--; break;
      default: throw new Error("illegal opcode " + opcode + " at " + (pc - 1));
    }
  }
}

export function main(input) {
  return execute(CODE, input.n | 0);
}
export const inputs = [{ n: 0 }, { n: 1 }, { n: 2 }, { n: 3 }, { n: 30 }, { n: 200 }, { n: 500 }];
