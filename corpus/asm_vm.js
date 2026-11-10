// inputs: [0, 1, 5, 10, -3]
// forbid-main: Int32Array|ArrayBuffer|switch|__pc
// asm.js: a bytecode VM whose program lives in the heap (written by a loader),
// run on a dynamic input. Opcodes: 0 halt, 1 push imm, 2 load arg, 3 add,
// 4 mul, 5 jz target, 6 jmp target, 7 dup, 8 sub, 9 swap, 10 over.
function Module(stdlib, foreign, heap) {
  "use asm";
  var H = new stdlib.Int32Array(heap);
  var imul = stdlib.Math.imul;
  function load(code, n) {
    code = code | 0; n = n | 0;
    var i = 0;
    for (i = 0; (i | 0) < (n | 0); i = (i + 1) | 0) H[(4096 + i) << 2 >> 2] = H[(code + i) << 2 >> 2] | 0;
  }
  function run(arg) {
    arg = arg | 0;
    var pc = 0, sp = 0, op = 0, a = 0, b = 0;
    for (;;) {
      op = H[(4096 + pc) << 2 >> 2] | 0;
      pc = (pc + 1) | 0;
      if ((op | 0) == 0) break;
      if ((op | 0) == 1) { H[(8192 + sp) << 2 >> 2] = H[(4096 + pc) << 2 >> 2] | 0; pc = (pc + 1) | 0; sp = (sp + 1) | 0; continue; }
      if ((op | 0) == 2) { H[(8192 + sp) << 2 >> 2] = arg; sp = (sp + 1) | 0; continue; }
      if ((op | 0) == 7) { H[(8192 + sp) << 2 >> 2] = H[(8192 + sp - 1) << 2 >> 2] | 0; sp = (sp + 1) | 0; continue; }
      if ((op | 0) == 10) { H[(8192 + sp) << 2 >> 2] = H[(8192 + sp - 2) << 2 >> 2] | 0; sp = (sp + 1) | 0; continue; }
      if ((op | 0) == 9) { a = H[(8192 + sp - 1) << 2 >> 2] | 0; H[(8192 + sp - 1) << 2 >> 2] = H[(8192 + sp - 2) << 2 >> 2] | 0; H[(8192 + sp - 2) << 2 >> 2] = a; continue; }
      if ((op | 0) == 5) {
        sp = (sp - 1) | 0;
        if ((H[(8192 + sp) << 2 >> 2] | 0) == 0) pc = H[(4096 + pc) << 2 >> 2] | 0; else pc = (pc + 1) | 0;
        continue;
      }
      if ((op | 0) == 6) { pc = H[(4096 + pc) << 2 >> 2] | 0; continue; }
      sp = (sp - 1) | 0; b = H[(8192 + sp) << 2 >> 2] | 0;
      sp = (sp - 1) | 0; a = H[(8192 + sp) << 2 >> 2] | 0;
      if ((op | 0) == 3) a = (a + b) | 0;
      if ((op | 0) == 4) a = imul(a, b);
      if ((op | 0) == 8) a = (a - b) | 0;
      H[(8192 + sp) << 2 >> 2] = a; sp = (sp + 1) | 0;
    }
    return H[(8192 + sp - 1) << 2 >> 2] | 0;
  }
  return { load: load, run: run };
}
// The bytecode: n = arg; sum = 0; while (n != 0) { sum += n * n; n -= 1 }
// return sum. Stack [n, sum]: load arg; push 0; L: over; jz END; over; dup;
// mul; add; swap; push 1; sub; swap; jmp L; END: halt.
var PROGRAM = [2, 1, 0, 10, 5, 17, 10, 7, 4, 3, 9, 1, 1, 8, 9, 6, 3, 0];
function main(input) {
  var heap = new ArrayBuffer(65536);
  var view = new Int32Array(heap);
  for (var i = 0; i < PROGRAM.length; i++) view[100 + i] = PROGRAM[i];
  var m = Module(globalThis, {}, heap);
  m.load(100, PROGRAM.length);
  return m.run(input < 0 ? 0 : input | 0);
}
