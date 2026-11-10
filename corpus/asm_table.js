// inputs: [0, 1, 2, 3, 9]
// forbid-main: \| 0 \| 0|globalThis
// asm.js: a function table indexed by a masked value.
function Module(stdlib, foreign, heap) {
  "use asm";
  function add(a, b) { a = a | 0; b = b | 0; return (a + b) | 0; }
  function sub(a, b) { a = a | 0; b = b | 0; return (a - b) | 0; }
  function mul(a, b) { a = a | 0; b = b | 0; return (a * b) | 0; }
  function first(a, b) { a = a | 0; b = b | 0; return a | 0; }
  function apply(op, a, b) { op = op | 0; a = a | 0; b = b | 0; return ops[op & 3](a, b) | 0; }
  function run(x) { x = x | 0; return ((apply(0, x, 3) | 0) + (apply(2, x, 5) | 0) + (apply(x, 10, 4) | 0)) | 0; }
  var ops = [add, sub, mul, first];
  return { run: run };
}
function main(input) {
  return Module(globalThis, {}, new ArrayBuffer(65536)).run(input);
}
