// inputs: [0, 1, 3, 20]
// forbid-main: \.value|globalThis
// asm.js doubles: Float64 heap, +x coercions, stdlib Math.
function Module(stdlib, foreign, heap) {
  "use asm";
  var F64 = new stdlib.Float64Array(heap);
  var sqrt = stdlib.Math.sqrt;
  function norm(n) {
    n = n | 0;
    var i = 0, s = 0.0;
    for (i = 0; (i | 0) < (n | 0); i = (i + 1) | 0) {
      F64[i << 3 >> 3] = +(i | 0) * 0.5;
    }
    for (i = 0; (i | 0) < (n | 0); i = (i + 1) | 0) {
      s = s + F64[i << 3 >> 3] * F64[i << 3 >> 3];
    }
    return +sqrt(s);
  }
  return { norm: norm };
}
function main(input) {
  return Module(globalThis, {}, new ArrayBuffer(65536)).norm(input);
}
