// style: CPU emulator (a 6502 subset: class with registers and N/Z/C/V flags, 64K byte memory, step() fetching an opcode byte and switching on hex opcodes)
// residue: \bopcode\b|\.step\(
// An emulator for a subset of the MOS 6502: A, X, Y, SP, PC, the N Z C V
// flags, immediate / zero-page / absolute / absolute,X addressing, the
// stack, JSR/RTS, and BRK as halt. The fixed program is machine code loaded
// at $0600: over the input bytes placed at $0200 it computes a 16-bit sum,
// the XOR of all bytes, and (through a subroutine) how many have the top bit
// set.
const PROGRAM_ORIGIN = 0x0600;
const DATA = 0x0200;
// prettier-ignore
const MACHINE_CODE = [
  /* 0600 */ 0xA2, 0x00,       // LDX #$00
  /* 0602 */ 0xA9, 0x00,       // LDA #$00
  /* 0604 */ 0x85, 0x10,       // STA $10    sum lo
  /* 0606 */ 0x85, 0x11,       // STA $11    sum hi
  /* 0608 */ 0x85, 0x12,       // STA $12    xor
  /* 060A */ 0x85, 0x13,       // STA $13    high-bit count
  /* 060C */ 0xE4, 0x00,       // loop: CPX $00 (length)
  /* 060E */ 0xF0, 0x1E,       // BEQ done (+$1E -> $062E)
  /* 0610 */ 0x20, 0x30, 0x06, // JSR count_high ($0630)
  /* 0613 */ 0xBD, 0x00, 0x02, // LDA $0200,X
  /* 0616 */ 0x45, 0x12,       // EOR $12
  /* 0618 */ 0x85, 0x12,       // STA $12
  /* 061A */ 0x18,             // CLC
  /* 061B */ 0xBD, 0x00, 0x02, // LDA $0200,X
  /* 061E */ 0x65, 0x10,       // ADC $10
  /* 0620 */ 0x85, 0x10,       // STA $10
  /* 0622 */ 0xA9, 0x00,       // LDA #$00
  /* 0624 */ 0x65, 0x11,       // ADC $11
  /* 0626 */ 0x85, 0x11,       // STA $11
  /* 0628 */ 0xE8,             // INX
  /* 0629 */ 0x4C, 0x0C, 0x06, // JMP loop
  /* 062C */ 0xEA, 0xEA,       // NOP NOP
  /* 062E */ 0x00,             // done: BRK
  /* 062F */ 0xEA,             // NOP
  /* 0630 */ 0xBD, 0x00, 0x02, // count_high: LDA $0200,X
  /* 0633 */ 0x10, 0x02,       // BPL +2
  /* 0635 */ 0xE6, 0x13,       // INC $13
  /* 0637 */ 0x60,             // RTS
];

const FLAG_C = 0x01, FLAG_Z = 0x02, FLAG_I = 0x04, FLAG_D = 0x08, FLAG_B = 0x10, FLAG_V = 0x40, FLAG_N = 0x80;

class CPU {
  constructor(memory) {
    this.mem = memory;
    this.a = 0;
    this.x = 0;
    this.y = 0;
    this.sp = 0xFD;
    this.pc = 0;
    this.p = FLAG_I | 0x20;
    this.halted = false;
    this.cycles = 0;
  }
  read(addr) { return this.mem[addr & 0xFFFF]; }
  write(addr, v) { this.mem[addr & 0xFFFF] = v & 0xFF; }
  fetch() { const v = this.mem[this.pc]; this.pc = (this.pc + 1) & 0xFFFF; return v; }
  fetch16() { const lo = this.fetch(); return lo | (this.fetch() << 8); }
  push(v) { this.mem[0x100 | this.sp] = v & 0xFF; this.sp = (this.sp - 1) & 0xFF; }
  pull() { this.sp = (this.sp + 1) & 0xFF; return this.mem[0x100 | this.sp]; }
  setFlag(f, on) { if (on) this.p |= f; else this.p &= ~f; }
  setNZ(v) { this.setFlag(FLAG_Z, (v & 0xFF) === 0); this.setFlag(FLAG_N, (v & 0x80) !== 0); }
  adc(v) {
    if (this.p & FLAG_D) throw new Error("decimal mode is not emulated");
    const sum = this.a + v + (this.p & FLAG_C);
    this.setFlag(FLAG_C, sum > 0xFF);
    this.setFlag(FLAG_V, (~(this.a ^ v) & (this.a ^ sum) & 0x80) !== 0);
    this.a = sum & 0xFF;
    this.setNZ(this.a);
  }
  compare(reg, v) {
    const r = reg - v;
    this.setFlag(FLAG_C, reg >= v);
    this.setNZ(r);
  }
  branch(cond) {
    const off = this.fetch();
    if (cond) {
      this.pc = (this.pc + ((off ^ 0x80) - 0x80)) & 0xFFFF;
      this.cycles++;
    }
  }
  step() {
    const opcode = this.fetch();
    this.cycles += 2;
    switch (opcode) {
      case 0x00: this.halted = true; this.setFlag(FLAG_B, true); break;           // BRK
      case 0xEA: break;                                                           // NOP
      case 0xA9: this.a = this.fetch(); this.setNZ(this.a); break;               // LDA #
      case 0xA5: this.a = this.read(this.fetch()); this.setNZ(this.a); break;    // LDA zp
      case 0xAD: this.a = this.read(this.fetch16()); this.setNZ(this.a); break;  // LDA abs
      case 0xBD: this.a = this.read(this.fetch16() + this.x); this.setNZ(this.a); break; // LDA abs,X
      case 0xA2: this.x = this.fetch(); this.setNZ(this.x); break;               // LDX #
      case 0xA0: this.y = this.fetch(); this.setNZ(this.y); break;               // LDY #
      case 0x85: this.write(this.fetch(), this.a); break;                        // STA zp
      case 0x8D: this.write(this.fetch16(), this.a); break;                      // STA abs
      case 0x9D: this.write(this.fetch16() + this.x, this.a); break;             // STA abs,X
      case 0x65: this.adc(this.read(this.fetch())); break;                       // ADC zp
      case 0x69: this.adc(this.fetch()); break;                                  // ADC #
      case 0x45: this.a ^= this.read(this.fetch()); this.setNZ(this.a); break;   // EOR zp
      case 0x49: this.a ^= this.fetch(); this.setNZ(this.a); break;              // EOR #
      case 0x29: this.a &= this.fetch(); this.setNZ(this.a); break;              // AND #
      case 0x09: this.a |= this.fetch(); this.setNZ(this.a); break;              // ORA #
      case 0xE6: { const ad = this.fetch(); const v = (this.read(ad) + 1) & 0xFF; this.write(ad, v); this.setNZ(v); this.cycles += 3; break; } // INC zp
      case 0xE8: this.x = (this.x + 1) & 0xFF; this.setNZ(this.x); break;        // INX
      case 0xC8: this.y = (this.y + 1) & 0xFF; this.setNZ(this.y); break;        // INY
      case 0xCA: this.x = (this.x - 1) & 0xFF; this.setNZ(this.x); break;        // DEX
      case 0xE4: this.compare(this.x, this.read(this.fetch())); break;           // CPX zp
      case 0xE0: this.compare(this.x, this.fetch()); break;                      // CPX #
      case 0xC9: this.compare(this.a, this.fetch()); break;                      // CMP #
      case 0x18: this.setFlag(FLAG_C, false); break;                             // CLC
      case 0x38: this.setFlag(FLAG_C, true); break;                              // SEC
      case 0xF0: this.branch(this.p & FLAG_Z); break;                            // BEQ
      case 0xD0: this.branch(!(this.p & FLAG_Z)); break;                         // BNE
      case 0x10: this.branch(!(this.p & FLAG_N)); break;                         // BPL
      case 0x30: this.branch(this.p & FLAG_N); break;                            // BMI
      case 0x90: this.branch(!(this.p & FLAG_C)); break;                         // BCC
      case 0xB0: this.branch(this.p & FLAG_C); break;                            // BCS
      case 0x4C: this.pc = this.fetch16(); this.cycles++; break;                 // JMP abs
      case 0x20: {                                                               // JSR abs
        const target = this.fetch16();
        const ret = (this.pc - 1) & 0xFFFF;
        this.push(ret >> 8);
        this.push(ret);
        this.pc = target;
        this.cycles += 4;
        break;
      }
      case 0x60: {                                                               // RTS
        const lo = this.pull();
        this.pc = ((lo | (this.pull() << 8)) + 1) & 0xFFFF;
        this.cycles += 4;
        break;
      }
      default:
        throw new Error("illegal opcode $" + opcode.toString(16) + " at $" + ((this.pc - 1) & 0xFFFF).toString(16));
    }
  }
}

export function main(input) {
  const bytes = input.bytes;
  if (bytes.length > 255) throw new Error("at most 255 bytes");
  const mem = new Uint8Array(0x10000);
  mem.set(MACHINE_CODE, PROGRAM_ORIGIN);
  mem.set(bytes, DATA);
  mem[0x00] = bytes.length;
  const cpu = new CPU(mem);
  cpu.pc = PROGRAM_ORIGIN;
  while (!cpu.halted) cpu.step();
  return { sum: mem[0x10] | (mem[0x11] << 8), xor: mem[0x12], high: mem[0x13], cycles: cpu.cycles };
}
export const inputs = [
  { bytes: [] },
  { bytes: [1] },
  { bytes: [255, 1] },
  { bytes: [128, 127, 200, 3, 0, 255, 64, 129] },
  { bytes: [72, 101, 108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218] },
  { bytes: [250, 3, 141, 77, 19, 202, 88, 160, 45, 231, 9, 112, 190, 66, 133, 24, 255, 0, 178, 51, 99, 210, 14, 147, 72, 186, 37, 129, 244, 6, 165, 93, 30, 219, 118, 61, 154, 2, 207, 83, 125, 238, 40, 171, 16, 196, 105, 58, 223, 137, 11, 180, 69, 248, 97, 152, 27, 213, 120, 44, 167, 233, 79, 140] },
  { bytes: [216, 219, 66, 212, 174, 229, 197, 182, 156, 202, 234, 166, 224, 130, 121, 105, 165, 36, 174, 136, 163, 66, 11, 0, 6, 145, 188, 111, 132, 144, 127, 195, 36, 135, 155, 152, 62, 49, 233, 24, 156, 179, 151, 128, 80, 110, 173, 92, 8, 154, 2, 227, 99, 189, 99, 4, 149, 201, 96, 53, 52, 80, 72, 189, 42, 0, 79, 207, 160, 199, 54, 157, 52, 5, 132, 107, 53, 127, 185, 102, 176, 184, 139, 169, 142, 177, 206, 100, 214, 142, 74, 49, 251, 171, 115, 44, 99, 28, 36, 143, 58, 138, 29, 245, 58, 2, 251, 245, 255, 214, 251, 55, 168, 223, 196, 134, 158, 109, 106, 242, 116, 149, 142, 163, 54, 76, 151, 26, 222, 86, 113, 118, 65, 107, 24, 118, 68, 183, 96, 134, 50, 219, 120, 59, 161, 82, 169, 2, 173, 147, 15, 52, 99, 187, 249, 104, 161, 143, 42, 99, 245, 64, 71, 110, 33, 32, 82, 120, 81, 231, 20, 169, 234, 164, 48, 211, 52, 115, 82, 101, 78, 22, 191, 221, 55, 117, 208, 99, 123, 6, 158, 184, 191, 27, 167, 79, 144, 98, 31, 203] },
];
