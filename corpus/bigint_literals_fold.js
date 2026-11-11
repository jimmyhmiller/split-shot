// inputs: [{"x":1}, {"x":"z"}]
// forbid-main: \* 3n|\*\* 64n|BigInt\.as|toString\(16\)|<< 70n|10n \*\*
// Known BigInts fold to the literal of their result: arithmetic (division truncating, `%` with the dividend's sign), `**`, shifts both ways (a right shift rounding toward negative infinity), the bit operators in two's complement, comparisons with each other and exactly with Numbers (fractions, infinities, NaN), `==` with numbers, booleans and texts, `String`, `Number` (rounded to nearest), `BigInt(...)`, `asIntN`/`asUintN`, `toString(radix)`. What throws stays the runtime's: `1n + 1`, `1n / 0n`, `2n ** -1n`, `1n >>> 0n`.
function main(input) {
  var big = 2n ** 64n;
  var out = [
    String(big + 3n), String((big + 7n) * 3n - 1n), String(-7n / 2n), String(-7n % 3n), String(7n % -3n), String(10n ** 20n / 7n % 1000n),
    String(5n << 70n), String(-5n >> 1n), String(-5n << -1n), String(1n << 0n), String(-6n & 5n), String(-6n | 5n), String(-6n ^ 5n), String(~5n), String(-(-3n)),
    2n > 1.5, 2n < 2.5, 2n >= 2, 2n > -Infinity, 2n < NaN, 2n == 2, 2n == "2", 2n == "0x2", 2n == true, 0n == false, 5n === 5, 5n == 5.5,
    Number(2n ** 53n + 1n), Number(2n ** 53n + 3n), Number(-(2n ** 64n)), String(BigInt(5)), String(BigInt(" 12 ")), String(BigInt(true)),
    String(BigInt.asUintN(8, 257n)), String(BigInt.asIntN(8, 255n)), String(BigInt.asIntN(64, 2n ** 63n)), (255n).toString(16), (-255n).toString(2),
    "v" + 12n, 12n + "v", typeof 1n, !0n, !1n, `${-3n}`
  ];
  var throws = [];
  for (var f of [function () { return 1n + 1; }, function () { return 1n / 0n; }, function () { return 2n ** -1n; }, function () { return 1n >>> 0n; }, function () { return BigInt(1.5); }]) {
    try { throws.push(String(f())); } catch (e) { throws.push(e.name); }
  }
  return [out, throws, input.x];
}
