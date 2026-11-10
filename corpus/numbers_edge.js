// inputs: [0, 1, 1.5, -2.25, 1e21, 7]
// forbid: Math\.|\*\*|0\.1 \+
function show(v) { return "" + v; }
function main(x) {
  var s = show(0.1 + 0.2) + "|" + show(1 / 0) + "|" + show(-1 / 0) + "|" + show(0 / 0) + "|" + show(-0)
    + "|" + show(1e21) + "|" + show(1e-7) + "|" + show(2 ** 53 + 1) + "|" + show(5 % -3) + "|" + show(-5 % 3)
    + "|" + show(1 / Math.round(-0.4)) + "|" + show(Math.round(2.5)) + "|" + show(Math.max()) + "|" + show(1 / Math.min(0, -0))
    + "|" + show(Math.sqrt(2)) + "|" + show(Math.fround(5.5)) + "|" + show(Math.imul(0xffffffff, 5)) + "|" + show(Math.clz32(1))
    + "|" + show(-"0x10") + "|" + show(+" 12.5e1 ") + "|" + show(+"1_0") + "|" + show(~~-7.9) + "|" + show(-7.9 | 0) + "|" + show(-1 >>> 28);
  return [s, x * 0.5, x / 3, x % 2, -x];
}
