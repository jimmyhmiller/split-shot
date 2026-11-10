// inputs: [0, 1, 7, 255]
// max-lines: 40
// An inner loop whose counter feeds nothing but its own test, around a body
// with a dynamic branch: every unrolled iteration would be the same code,
// so it stays a loop (it was unrolled eight times per outer iteration).
function main(n) {
  var c = n;
  for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
}
