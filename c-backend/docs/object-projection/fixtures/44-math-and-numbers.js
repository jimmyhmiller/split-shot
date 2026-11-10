// @case {"description": "Math functions and constants, number conversion and parsing globals, and Number helpers.", "inputs": ["-3", "-0", "0", "1", "3", "5"]}
function main(x) {
  var h = x / 2;
  var rounding = [Math.floor(h), Math.ceil(h), Math.round(h), Math.round(-h), Math.trunc(-h), Math.abs(-x),
    Math.sign(x), Math.round(2.5), Math.round(-2.5), Math.round(0.49999999999999994), Math.floor("7.9"), Math.trunc(-0.5)];
  var combine = [Math.min(), Math.max(), Math.min(x, 2, -1), Math.max(x, 2, -1), Math.max(x, 0 / 0),
    Math.pow(2, x), Math.sqrt(16), Math.hypot(3, 4), Math.imul(x, 65536 * 65535), Math.clz32(x), Math.fround(5.5),
    Math.atan2(0, -1) === Math.PI, Math.cbrt(27), Math.log2(8), Math.log10(1000), Math.exp(0), Math.log(1),
    Math.sin(0), Math.cos(0)];
  var constants = [Math.PI, Math.E, Math.SQRT2, Math.LN2, Number.MAX_SAFE_INTEGER, Number.EPSILON];
  var parsing = [parseInt("42px"), parseInt("  -17"), parseInt("0x1f"), parseInt("101", 2), parseInt("z", 36),
    parseInt("abc"), parseInt("12", 1), parseFloat("3.25e2xyz"), parseFloat(".5"), parseFloat("-Infinityx"),
    parseFloat("e5"), parseFloat("1e"), Number("12"), Number(""), Number(), Number(null), Number("x")];
  var tests = [isNaN(x / 0 - x / 0), isNaN("abc"), isFinite(x), isFinite(1 / 0), Number.isInteger(h),
    Number.isInteger("5"), Number.isNaN(0 / 0), Number.isNaN("x"), Number.isFinite(x), Number.isSafeInteger(2 ** 53),
    Boolean(x), Boolean("")];
  var text = [(255).toString(16), (x).toString(2), (-255).toString(36), (1.5).toString(), x.toString(),
    true.toString(), "s".toString(), (5).valueOf() + 1];
  return [rounding, combine, constants, parsing, tests, text];
}
