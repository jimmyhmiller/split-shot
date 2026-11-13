// An emulator's memory given runtime input: the program's bytes stay known
// after `mem.set(bytes, DATA)` copies the input in (the copy's extent is
// bounded by the guard on `bytes.length`), the typed array being both
// modeled and the runtime array (see `Js::mirror_typed_array`): fetches
// fold, a read of the input reads the runtime array, and every write the
// model makes goes to it too. `this.push(...)` is the machine's own method,
// not an array's.
const CODE = [
  /* 40 */ 0x01, 0x00,       // LDX #0
  /* 42 */ 0x02, 0x00,       // LDA #0
  /* 44 */ 0x03, 0x10,       // loop: CPX $10 (length)
  /* 46 */ 0x04, 0x0a,       // BEQ +10 -> 58
  /* 48 */ 0x05, 0x40, 0x3c, // JSR 60
  /* 4b */ 0x06,             // INX
  /* 4c */ 0x07, 0x44,       // JMP 44
  /* 4e */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  /* 58 */ 0x08, 0x11,       // STA $11
  /* 5a */ 0x00, 0x00,       // HLT
  /* 5c */ 0, 0, 0, 0,
  /* 60 */ 0x09, 0x80,       // ADC $80,X
  /* 62 */ 0x0a,             // RTS
];
const ORIGIN = 0x40, DATA = 0x80;
class Machine {
  constructor(mem) { this.mem = mem; this.a = 0; this.x = 0; this.z = false; this.sp = 0x3f; this.pc = ORIGIN; this.halted = false; }
  fetch() { const v = this.mem[this.pc]; this.pc = (this.pc + 1) & 0xff; return v; }
  push(v) { this.mem[this.sp] = v & 0xff; this.sp = (this.sp - 1) & 0xff; }
  pull() { this.sp = (this.sp + 1) & 0xff; return this.mem[this.sp]; }
  step() {
    const op = this.fetch();
    switch (op) {
      case 0x00: this.halted = true; break;
      case 0x01: this.x = this.fetch(); break;
      case 0x02: this.a = this.fetch(); break;
      case 0x03: this.z = this.x === this.mem[this.fetch()]; break;
      case 0x04: { const off = this.fetch(); if (this.z) this.pc = (this.pc + off) & 0xff; break; }
      case 0x05: { const hi = this.fetch(); const lo = this.fetch(); this.push(this.pc); this.pc = (hi & 0x40) | lo; break; }
      case 0x06: this.x = (this.x + 1) & 0xff; break;
      case 0x07: this.pc = this.fetch(); break;
      case 0x08: this.mem[this.fetch()] = this.a; break;
      case 0x09: this.a = (this.a + this.mem[(this.fetch() + this.x) & 0xff]) & 0xff; break;
      case 0x0a: this.pc = this.pull(); break;
      default: throw new Error("illegal opcode " + op);
    }
  }
}
export function main(input) {
  const bytes = input.bytes;
  if (bytes.length > 64) throw new Error("at most 64 bytes");
  const mem = new Uint8Array(256);
  mem.set(CODE, ORIGIN);
  mem.set(bytes, DATA);
  mem[0x10] = bytes.length;
  const m = new Machine(mem);
  while (!m.halted) m.step();
  return { sum: mem[0x11], x: m.x, top: mem[0x3f] };
}
