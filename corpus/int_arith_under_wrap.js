// inputs: [0, 1, 255, 256, -1, 2.5, -0.5, "7", "x", 4294967295, 2147483647, -2147483648, 1e21, null]
// forbid-main: [+-] \d+ (&|\||>>>|<<) \d+( >> \d+)?\) [+-] \d+ (&|\||>>>|<<) (255|65535|0|24)\b
// Integer arithmetic under a reduction modulo a power of two combines, for any value: the first reduction makes the value an integer (it stays), and each further `+ c` then reduce is folded into one. Bytes (`& 255`), signed bytes (`<< 24 >> 24`), 32-bit integers (`| 0`, `>>> 0`), and a typed array's stores, up and down, across wraparound.
function main(input) {
  var b = input & 255;
  for (var i = 0; i < 300; i++) b = (b + 1) & 255;
  var down = input & 255;
  for (var j = 0; j < 7; j++) down = (down - 1) & 255;
  var s8 = new Int8Array(1); s8[0] = input;
  for (var k = 0; k < 130; k++) s8[0]++;
  var u16 = new Uint16Array(1); u16[0] = input;
  for (var m = 0; m < 5; m++) u16[0] += 13107;
  var i32 = input | 0;
  for (var n = 0; n < 4; n++) i32 = (i32 + 1073741823) | 0;
  var u32 = input >>> 0;
  for (var p = 0; p < 3; p++) u32 = (u32 - 5) >>> 0;
  var mixed = ((input & 65535) + 3 & 255) + 4 & 255;
  var notMask = ((input & 254) + 1 & 254) + 1 & 254;
  return [b, down, s8[0], u16[0], i32, u32, mixed, notMask];
}
