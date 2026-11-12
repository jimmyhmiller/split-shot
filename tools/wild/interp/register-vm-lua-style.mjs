// style: register VM (Lua 5.1-style 32-bit instruction words with A/B/C/sBx fields, RK constants, switch on the decoded opcode)
// residue: \b(OP_[A-Z]+|instr)\b
// A register machine in the manner of Lua's: each instruction is one 32-bit
// word (opcode in 6 bits, A in 8, B and C in 9, or a signed Bx), B and C may
// name a constant (RK), comparisons skip the next instruction, numeric `for`
// is FORPREP/FORLOOP. The fixed chunk: over i in 1..n, the longest Collatz
// trajectory, returning [steps, i].
const OP_MOVE = 0, OP_LOADK = 1, OP_ADD = 2, OP_SUB = 3, OP_MUL = 4, OP_IDIV = 5,
  OP_MOD = 6, OP_JMP = 7, OP_EQ = 8, OP_LT = 9, OP_LE = 10, OP_FORPREP = 11,
  OP_FORLOOP = 12, OP_RETURN = 13;

const SIZE_OP = 6, SIZE_A = 8, SIZE_B = 9, SIZE_C = 9;
const POS_A = SIZE_OP, POS_C = POS_A + SIZE_A, POS_B = POS_C + SIZE_C;
const POS_BX = POS_C;
const MAXARG_BX = (1 << (SIZE_B + SIZE_C)) - 1;
const MAXARG_SBX = MAXARG_BX >> 1;
const BITRK = 1 << (SIZE_B - 1);
const RK = (k) => k | BITRK;

const CREATE_ABC = (o, a, b, c) => (o | (a << POS_A) | (b << POS_B) | (c << POS_C)) >>> 0;
const CREATE_ABx = (o, a, bx) => (o | (a << POS_A) | (bx << POS_BX)) >>> 0;
const GET_OPCODE = (i) => i & 0x3f;
const GETARG_A = (i) => (i >>> POS_A) & 0xff;
const GETARG_B = (i) => (i >>> POS_B) & 0x1ff;
const GETARG_C = (i) => (i >>> POS_C) & 0x1ff;
const GETARG_sBx = (i) => (i >>> POS_BX) - MAXARG_SBX;

// The chunk, written as a listing with labels; jumps are resolved to sBx
// offsets relative to the following instruction, as luac does.
// registers: 0 n, 1 best, 2 bestI, 3..6 for-loop (index, limit, step, i),
// 7 x, 8 steps, 9 tmp
// constants: K0 = 0, K1 = 1, K2 = 2, K3 = 3
const K = [0, 1, 2, 3];
const LISTING = [
  [OP_LOADK, 1, 0],
  [OP_LOADK, 2, 0],
  [OP_LOADK, 3, 1],
  [OP_MOVE, 4, 0, 0],
  [OP_LOADK, 5, 1],
  [OP_FORPREP, 3, "forloop"],
  "body",
  [OP_MOVE, 7, 6, 0],
  [OP_LOADK, 8, 0],
  "collatz",
  [OP_LE, 1, 7, RK(1)],        // if x <= 1 goto done
  [OP_JMP, 0, "done"],
  [OP_MOD, 9, 7, RK(2)],
  [OP_EQ, 1, 9, RK(0)],        // if x % 2 == 0 goto even
  [OP_JMP, 0, "even"],
  [OP_MUL, 7, 7, RK(3)],
  [OP_ADD, 7, 7, RK(1)],
  [OP_JMP, 0, "count"],
  "even",
  [OP_IDIV, 7, 7, RK(2)],
  "count",
  [OP_ADD, 8, 8, RK(1)],
  [OP_JMP, 0, "collatz"],
  "done",
  [OP_LT, 0, 1, 8],            // if not (best < steps) goto forloop
  [OP_JMP, 0, "forloop"],
  [OP_MOVE, 1, 8, 0],
  [OP_MOVE, 2, 6, 0],
  "forloop",
  [OP_FORLOOP, 3, "body"],
  [OP_RETURN, 1, 3, 0],
];

function assemble(listing) {
  const labels = new Map();
  let n = 0;
  for (const item of listing) {
    if (typeof item === "string") labels.set(item, n);
    else n++;
  }
  const code = new Uint32Array(n);
  let pc = 0;
  for (const item of listing) {
    if (typeof item === "string") continue;
    const [op, a, b, c] = item;
    if (op === OP_JMP || op === OP_FORPREP || op === OP_FORLOOP) {
      const target = labels.get(b);
      if (target === undefined) throw new Error("undefined label " + b);
      code[pc] = CREATE_ABx(op, a, target - (pc + 1) + MAXARG_SBX);
    } else if (op === OP_LOADK) {
      code[pc] = CREATE_ABx(op, a, b);
    } else {
      code[pc] = CREATE_ABC(op, a, b, c);
    }
    pc++;
  }
  return code;
}

const PROTO = { code: assemble(LISTING), k: K, maxstack: 10 };

function luaV_execute(proto, args) {
  const code = proto.code;
  const k = proto.k;
  const base = new Array(proto.maxstack).fill(null);
  for (let j = 0; j < args.length; j++) base[j] = args[j];
  const RKB = (i) => { const b = GETARG_B(i); return b & BITRK ? k[b & ~BITRK] : base[b]; };
  const RKC = (i) => { const c = GETARG_C(i); return c & BITRK ? k[c & ~BITRK] : base[c]; };
  let pc = 0;
  for (;;) {
    const instr = code[pc++];
    const ra = GETARG_A(instr);
    switch (GET_OPCODE(instr)) {
      case OP_MOVE: base[ra] = base[GETARG_B(instr)]; break;
      case OP_LOADK: base[ra] = k[instr >>> POS_BX]; break;
      case OP_ADD: base[ra] = RKB(instr) + RKC(instr); break;
      case OP_SUB: base[ra] = RKB(instr) - RKC(instr); break;
      case OP_MUL: base[ra] = RKB(instr) * RKC(instr); break;
      case OP_IDIV: base[ra] = Math.floor(RKB(instr) / RKC(instr)); break;
      case OP_MOD: { const a = RKB(instr), b = RKC(instr); base[ra] = a - Math.floor(a / b) * b; break; }
      case OP_JMP: pc += GETARG_sBx(instr); break;
      case OP_EQ: if ((RKB(instr) === RKC(instr)) !== (ra !== 0)) pc++; break;
      case OP_LT: if ((RKB(instr) < RKC(instr)) !== (ra !== 0)) pc++; break;
      case OP_LE: if ((RKB(instr) <= RKC(instr)) !== (ra !== 0)) pc++; break;
      case OP_FORPREP:
        base[ra] -= base[ra + 2];
        pc += GETARG_sBx(instr);
        break;
      case OP_FORLOOP: {
        const step = base[ra + 2];
        const idx = base[ra] + step;
        const limit = base[ra + 1];
        if (step > 0 ? idx <= limit : limit <= idx) {
          pc += GETARG_sBx(instr);
          base[ra] = idx;
          base[ra + 3] = idx;
        }
        break;
      }
      case OP_RETURN: {
        const b = GETARG_B(instr);
        return base.slice(ra, ra + b - 1);
      }
      default:
        throw new Error("bad opcode " + GET_OPCODE(instr));
    }
  }
}

export function main(input) {
  return luaV_execute(PROTO, [input.n | 0]);
}
export const inputs = [{ n: 0 }, { n: 1 }, { n: 2 }, { n: 7 }, { n: 27 }, { n: 60 }, { n: 100 }];
