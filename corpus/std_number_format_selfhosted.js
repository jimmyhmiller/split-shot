// inputs: [0, 1.5, 1234.5678, -0.000123, 1e21]
// forbid-main: \.(?:toFixed|toExponential|toPrecision|toString)\(
// Number.prototype.toFixed, toExponential, toPrecision and toString(radix) of known numbers, folded by their self-hosted versions (prelude.js `__pe_std_Number_prototype_toFixed` and the rest), which work from the number's exact binary value: halves that round up and near-halves that do not (1.005, 1.45, 8.345), carries into a new digit (9.995, 0.9999), zero and negative zero, negative numbers that round to zero, 0 to 100 digits, the largest and smallest doubles, 1e21 and beyond, NaN and the infinities, digit counts that are not integers; radixes 2 to 36 of fractions, of whole numbers past 2^53, with V8's rounding of the last digit. (Calls that stay the runtime's are in std_number_format_fallback_selfhosted.js.)
function main(input) {
  var out = [];
  var xs = [0, -0, 1, -1, 0.5, 1.5, 2.5, -2.5, 0.05, 0.15, 0.25, 0.35, 1.005, 1.45, 8.345, 9.995, 0.9999, 99.5, 999.5, 0.000001, 1e-7, 1.25e-7, 123.456, -123.456, 1234.5678, 0.1, 0.2, 0.3, 1 / 3, 2 / 3, 4.35, 1e21, 1.5e21, 999999999999999900000, 123456789012345680000, 9007199254740992, 9007199254740993, 4503599627370496.5, 0.1 + 0.2, 5e-324, 1.7976931348623157e308, 1e-10, -1e-10, 1e100, 1.0000000000000002, 0.9999999999999999, 25, 1e5, 123456, 1.5e-5, 0.00015, 0.045, 1.255, 10.235, 1e-20, 0.5e-6, 0.999, 9.5, 95, 0.95, 0.095];
  var fx = [0, 1, 2, 3, 20, 100];
  for (var i = 0; i < xs.length; i++) {
    var x = xs[i];
    var row = [];
    for (var j = 0; j < fx.length; j++) row.push(x.toFixed(fx[j]));
    if (i < 8) row.push(x.toFixed(), x.toFixed(undefined), x.toFixed(2.9), x.toFixed("3"), x.toFixed(null), x.toFixed(NaN), x.toFixed(-0.5));
    out.push(row.join(" "));
  }
  var ex = [0, 1, 2, 16, 20, 100];
  var big = [0, -0, 1, -1, 9.99, 9.995, 99.99, 0.000123456, 123456, 1.45, 1.55, 2.5, 25, 0.5, 5e-7, 1e21, 1e-30, 123.456, -0.00015, 9.5, 95, 0.95, 999.9999, 0.1, 1 / 3, 4.35, 1.005, 8.345, 1e23, 9007199254740993];
  for (var i2 = 0; i2 < big.length; i2++) {
    var y = big[i2];
    var erow = [];
    for (var j2 = 0; j2 < ex.length; j2++) erow.push(y.toExponential(ex[j2]));
    erow.push(y.toExponential());
    if (i2 < 8) erow.push(y.toExponential(undefined), y.toExponential(2.9), y.toExponential("3"), y.toExponential(null));
    out.push(erow.join(" "));
    var prow = [];
    var ps = [1, 2, 3, 7, 17, 21, 100];
    for (var j3 = 0; j3 < ps.length; j3++) prow.push(y.toPrecision(ps[j3]));
    if (i2 < 8) prow.push(y.toPrecision(), y.toPrecision(undefined), y.toPrecision(2.9), y.toPrecision("3"));
    out.push(prow.join(" "));
  }
  // The largest and the smallest: hundreds of exact digits.
  var ends = [1.7976931348623157e308, 1.5e300, 5e-100, 1.2345e-60];
  for (var i4 = 0; i4 < ends.length; i4++) out.push(ends[i4].toExponential(0) + " " + ends[i4].toExponential(20) + " " + ends[i4].toPrecision(1) + " " + ends[i4].toPrecision(17) + " " + ends[i4].toPrecision(100).length + " " + ends[i4].toFixed(3).length);
  out.push((2.2250738585072014e-308).toPrecision(17), (5e-324).toExponential(20), (5e-324).toPrecision(100), (1.2345e-150).toPrecision(3));
  // The shortest digits, for toExponential() with none asked.
  out.push((0.000001).toExponential(), (1e-7).toExponential(), (123.456).toExponential(), (1e21).toExponential(), (0.1 + 0.2).toExponential(), (5e-324).toExponential(), (1.7976931348623157e308).toExponential(), (100).toExponential(), (-1200).toExponential(), (4.9e-7).toExponential(), (12345678901234567890).toExponential());
  // toPrecision: where the exponent form starts (below 1e-6, at 10^precision).
  out.push((0.000001).toPrecision(1), (0.0000001).toPrecision(1), (0.00000099).toPrecision(1), (0.00000095).toPrecision(1), (99.99).toPrecision(2), (99.99).toPrecision(3), (99.99).toPrecision(4), (1e21).toPrecision(21), (1e21).toPrecision(22), (1e21).toPrecision(25), (123456).toPrecision(6), (123456).toPrecision(5), (999999.5).toPrecision(6), (0.00001).toPrecision(3), (1e-7).toPrecision(21));
  // toFixed of the smallest numbers.
  out.push((1.2345e-150).toExponential(3), (1.2345e-150).toFixed(3), (5e-324).toFixed(100), (1e-109).toFixed(100), (1e-111).toFixed(100), (9.9e-101).toFixed(100), (5e-101).toFixed(100), (4.9e-101).toFixed(100));
  // Not finite.
  out.push(NaN.toFixed(2), Infinity.toFixed(2), (-Infinity).toFixed(0), NaN.toExponential(2), Infinity.toExponential(), (-Infinity).toExponential(5), NaN.toPrecision(3), Infinity.toPrecision(3), (-Infinity).toPrecision(), NaN.toString(2), Infinity.toString(16), (-Infinity).toString(36));
  // toString(radix).
  var rs = [2, 3, 7, 12, 16, 27, 36];
  var vals = [0.5, 0.1, -0.1, 1 / 3, 255.5, -255.255, 0.000001, 1e-7, 123.456, 3.141592653589793, 2.718281828459045, 0.1 + 0.2, 1e21, 1.5e22, 9007199254740993, 18014398509481984, 1e30, -1e30, 1.7976931348623157e308, 5e-324, 0.9999999999999999, 1.0000000000000002, 4503599627370495.5, 0.75, 1e-10, 12345.6789, 0.5e-3, 100.001, 7.999999999999999, 35.99999999999999, 2251799813685247.8];
  for (var i3 = 0; i3 < vals.length; i3++) {
    var v = vals[i3];
    var srow = [];
    for (var j4 = 0; j4 < rs.length; j4++) srow.push(v.toString(rs[j4]));
    if (i3 < 6) srow.push(v.toString(), v.toString(10), v.toString(undefined), v.toString("16"), v.toString(2.9), v.toString(10.5));
    out.push(srow.join(" ").length > 4000 ? srow.join(" ").length : srow.join(" "));
  }
  out.push((0).toString(2), (-0).toString(2), (-0).toString(36), (0.5).toString(36), (-7.5).toString(2), (9007199254740992).toString(2), (9007199254740994).toString(16), (1152921504606846976).toString(3), (1e21).toString(7), (255).toString(16), (-255).toString(2), (35).toString(36), (0.1).toString(2), (0.1).toString(3).length, (1e-7).toString(36));
  // In use.
  var price = 1234.5;
  out.push("$" + price.toFixed(2), (0.1 + 0.2).toFixed(10) === "0.3000000000", +(1.005).toFixed(2), Number((2.345).toFixed(2)) * 100, (1e21).toFixed(2).length, (17).toString(2).padStart(8, "0"), parseFloat((0.1 * 3).toPrecision(15)));
  return out;
}
