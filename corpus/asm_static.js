// inputs: [0, 7]
// forbid-main: while|imul|Int32Array|ArrayBuffer
// asm.js with a static workload: everything but the final add is known.
function Module(stdlib, foreign, heap) {
  "use asm";
  var HEAP32 = new stdlib.Int32Array(heap);
  var imul = stdlib.Math.imul;
  function fib(n) {
    n = n | 0;
    if ((n | 0) < 2) return n | 0;
    return ((fib((n - 1) | 0) | 0) + (fib((n - 2) | 0) | 0)) | 0;
  }
  function sieve(n) {
    n = n | 0;
    var i = 0, j = 0, count = 0;
    for (i = 2; (i | 0) < (n | 0); i = (i + 1) | 0) HEAP32[i << 2 >> 2] = 1;
    for (i = 2; (imul(i, i) | 0) < (n | 0); i = (i + 1) | 0)
      if (HEAP32[i << 2 >> 2] | 0)
        for (j = imul(i, i); (j | 0) < (n | 0); j = (j + i) | 0) HEAP32[j << 2 >> 2] = 0;
    for (i = 2; (i | 0) < (n | 0); i = (i + 1) | 0) count = (count + (HEAP32[i << 2 >> 2] | 0)) | 0;
    return count | 0;
  }
  return { fib: fib, sieve: sieve };
}
function main(input) {
  var m = Module(globalThis, {}, new ArrayBuffer(65536));
  return (m.fib(15) + m.sieve(200) + input) | 0;
}
