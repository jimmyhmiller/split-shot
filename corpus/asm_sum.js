// inputs: [0, 1, 10, 1000]
// forbid-main: \| 0 \| 0|globalThis
// asm.js: an integer loop with coercions.
function Module(stdlib, foreign, heap) {
  "use asm";
  var imul = stdlib.Math.imul;
  function sumSquares(n) {
    n = n | 0;
    var i = 0, s = 0;
    for (i = 0; (i | 0) < (n | 0); i = (i + 1) | 0) {
      s = (s + imul(i, i)) | 0;
    }
    return s | 0;
  }
  return { sumSquares: sumSquares };
}
function main(input) {
  var m = Module(globalThis, {}, new ArrayBuffer(65536));
  return m.sumSquares(input);
}
