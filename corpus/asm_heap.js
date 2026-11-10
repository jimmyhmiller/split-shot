// inputs: [0, 1, 5, 64]
// forbid-main: \.value|globalThis
// asm.js: a heap of Int32 words; fill an array in memory, then reduce it.
function Module(stdlib, foreign, heap) {
  "use asm";
  var HEAP32 = new stdlib.Int32Array(heap);
  function fill(base, n) {
    base = base | 0; n = n | 0;
    var i = 0;
    for (i = 0; (i | 0) < (n | 0); i = (i + 1) | 0) {
      HEAP32[(base + (i << 2)) >> 2] = (i * 3 + 1) | 0;
    }
  }
  function sum(base, n) {
    base = base | 0; n = n | 0;
    var i = 0, s = 0;
    for (i = 0; (i | 0) < (n | 0); i = (i + 1) | 0) {
      s = (s + (HEAP32[(base + (i << 2)) >> 2] | 0)) | 0;
    }
    return s | 0;
  }
  return { fill: fill, sum: sum };
}
function main(input) {
  var m = Module(globalThis, {}, new ArrayBuffer(65536));
  m.fill(1024, input);
  return m.sum(1024, input);
}
