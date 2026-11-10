// inputs: [0, 1, 5, 40]
// A typed array written by a loop under runtime control: its buffer becomes a
// runtime value at the loop head (and so do the views of it), so the loop
// stays a loop.
function main(n) {
  var buf = new Uint32Array(64);
  var view = buf.subarray(8, 16);
  for (var i = 0; i < n; i++) {
    buf[i % 64] = (buf[(i + 63) % 64] * 31 + i) >>> 0;
  }
  var s = 0;
  for (var k = 0; k < view.length; k++) s = (s + view[k]) >>> 0;
  return [s, buf[0], buf.length, view.byteOffset].join(",");
}
