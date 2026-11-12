// style: assembler + register VM (assembly text with labels assembled at load by a two-pass assembler into fixed-width Int32Array words, memory in an Int32Array)
// residue: \b(OP_[A-Z]+|opcode)\b
// Assembly source (labels, mnemonics, registers, immediates, `;` comments)
// is assembled once at load into four words per instruction; the VM has
// sixteen registers and a word-addressed memory. The fixed program takes an
// array placed in memory: it counts the inversions (O(n^2)) and finds the
// largest sum of a contiguous run (Kadane), emitting both with `out`.
const SOURCE = `
; r0 = n, memory[0..n) = the array
        movi r1, 0          ; i
        movi r2, 0          ; inversions
outer:  bge  r1, r0, kadane
        addi r3, r1, 1      ; j = i + 1
inner:  bge  r3, r0, next
        load r4, r1
        load r5, r3
        ble  r4, r5, skip
        addi r2, r2, 1
skip:   addi r3, r3, 1
        jmp  inner
next:   addi r1, r1, 1
        jmp  outer

kadane: movi r1, 0          ; i
        movi r6, 0          ; best
        movi r7, 0          ; current
        movi r8, 0          ; zero
kloop:  bge  r1, r0, done
        load r4, r1
        add  r7, r7, r4
        bge  r7, r8, pos
        movi r7, 0
pos:    ble  r7, r6, knext
        mov  r6, r7
knext:  addi r1, r1, 1
        jmp  kloop

done:   out  r2
        out  r6
        halt
`;

const OP_HALT = 0, OP_MOV = 1, OP_MOVI = 2, OP_ADD = 3, OP_SUB = 4, OP_ADDI = 5,
  OP_LOAD = 6, OP_STORE = 7, OP_JMP = 8, OP_BGE = 9, OP_BLT = 10, OP_BLE = 11,
  OP_BEQ = 12, OP_BNE = 13, OP_OUT = 14, OP_MUL = 15;

// Operand kinds: r register, i immediate, l label.
const INSTRUCTIONS = {
  halt: [OP_HALT, ""],
  mov: [OP_MOV, "rr"],
  movi: [OP_MOVI, "ri"],
  add: [OP_ADD, "rrr"],
  sub: [OP_SUB, "rrr"],
  mul: [OP_MUL, "rrr"],
  addi: [OP_ADDI, "rri"],
  load: [OP_LOAD, "rr"],
  store: [OP_STORE, "rr"],
  jmp: [OP_JMP, "l"],
  bge: [OP_BGE, "rrl"],
  blt: [OP_BLT, "rrl"],
  ble: [OP_BLE, "rrl"],
  beq: [OP_BEQ, "rrl"],
  bne: [OP_BNE, "rrl"],
  out: [OP_OUT, "r"],
};

function assemble(source) {
  const lines = [];
  for (const raw of source.split("\n")) {
    let line = raw.replace(/;.*$/, "").trim();
    const m = /^([A-Za-z_]\w*):\s*(.*)$/.exec(line);
    let label = null;
    if (m) { label = m[1]; line = m[2]; }
    lines.push({ label, text: line, lineNo: lines.length + 1 });
  }
  // Pass one: addresses of labels.
  const symbols = new Map();
  let addr = 0;
  for (const l of lines) {
    if (l.label !== null) {
      if (symbols.has(l.label)) throw new Error(`line ${l.lineNo}: duplicate label ${l.label}`);
      symbols.set(l.label, addr);
    }
    if (l.text !== "") addr += 4;
  }
  // Pass two: encode.
  const words = new Int32Array(addr);
  addr = 0;
  for (const l of lines) {
    if (l.text === "") continue;
    const [mnemonic, ...rest] = l.text.split(/\s+/);
    const spec = INSTRUCTIONS[mnemonic.toLowerCase()];
    if (spec === undefined) throw new Error(`line ${l.lineNo}: unknown mnemonic ${mnemonic}`);
    const operands = rest.join(" ").split(",").map((s) => s.trim()).filter((s) => s !== "");
    const [op, kinds] = spec;
    if (operands.length !== kinds.length) throw new Error(`line ${l.lineNo}: ${mnemonic} takes ${kinds.length} operands`);
    words[addr] = op;
    for (let k = 0; k < kinds.length; k++) {
      const o = operands[k];
      let v;
      if (kinds[k] === "r") {
        const r = /^r(\d+)$/.exec(o);
        if (!r || +r[1] > 15) throw new Error(`line ${l.lineNo}: bad register ${o}`);
        v = +r[1];
      } else if (kinds[k] === "i") {
        if (!/^-?\d+$/.test(o)) throw new Error(`line ${l.lineNo}: bad immediate ${o}`);
        v = parseInt(o, 10);
      } else {
        if (!symbols.has(o)) throw new Error(`line ${l.lineNo}: undefined label ${o}`);
        v = symbols.get(o);
      }
      words[addr + 1 + k] = v;
    }
    addr += 4;
  }
  return words;
}

const IMAGE = assemble(SOURCE);

function run(code, memory, regs) {
  const output = [];
  let pc = 0;
  for (;;) {
    const opcode = code[pc], a = code[pc + 1], b = code[pc + 2], c = code[pc + 3];
    pc += 4;
    switch (opcode) {
      case OP_HALT: return output;
      case OP_MOV: regs[a] = regs[b]; break;
      case OP_MOVI: regs[a] = b; break;
      case OP_ADD: regs[a] = (regs[b] + regs[c]) | 0; break;
      case OP_SUB: regs[a] = (regs[b] - regs[c]) | 0; break;
      case OP_MUL: regs[a] = Math.imul(regs[b], regs[c]); break;
      case OP_ADDI: regs[a] = (regs[b] + c) | 0; break;
      case OP_LOAD: regs[a] = memory[regs[b]]; break;
      case OP_STORE: memory[regs[a]] = regs[b]; break;
      case OP_JMP: pc = a; break;
      case OP_BGE: if (regs[a] >= regs[b]) pc = c; break;
      case OP_BLT: if (regs[a] < regs[b]) pc = c; break;
      case OP_BLE: if (regs[a] <= regs[b]) pc = c; break;
      case OP_BEQ: if (regs[a] === regs[b]) pc = c; break;
      case OP_BNE: if (regs[a] !== regs[b]) pc = c; break;
      case OP_OUT: output.push(regs[a]); break;
      default: throw new Error(`illegal instruction ${opcode} at ${pc - 4}`);
    }
  }
}

export function main(input) {
  const xs = input.xs;
  const memory = new Int32Array(1024);
  if (xs.length > memory.length) throw new Error("array does not fit in memory");
  memory.set(xs);
  const regs = new Int32Array(16);
  regs[0] = xs.length;
  return run(IMAGE, memory, regs);
}
export const inputs = [
  { xs: [] },
  { xs: [5] },
  { xs: [-1] },
  { xs: [-3, -1, -2] },
  { xs: [1, -2, 3, 4, -1, 2, -5, 4] },
  { xs: [12, -7, 33, 5, -20, 18, 9, -4, -15, 27, 3, -8, 14, 1, -30, 22, 6, -2, 11, -9, 17, 4, -12, 8, 25, -6, -18, 10, 2, -1] },
  { xs: [44, -13, 7, 29, -50, 31, 2, -8, 19, 60, -27, 5, 13, -3, 38, -41, 9, 21, -16, 4, 55, -22, 1, 17, -9, 33, -5, 12, -36, 26, 8, -14, 47, -2, 15, -30, 3, 24, -11, 6, 39, -19, 10, -7, 28, -45, 20, 14, -1, 35] },
];
