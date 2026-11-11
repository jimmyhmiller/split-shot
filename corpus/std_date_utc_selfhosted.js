// inputs: [0, 1, 1999, -5, 12.7]
// forbid-main: Date\.UTC\((?![^()]*\b[A-Za-z]{1,2}[,)])
// Date.UTC folded by its self-hosted version (prelude.js `__pe_std_Date_UTC`): one to seven arguments and none, years 0 to 99 (the 1900s), leap years and centuries, months and days and times out of range carrying over (negative too), fractions truncated, the ends of the time range and just past them (NaN), NaN and infinite and non-numeric arguments; and with a runtime year, where the call stays the runtime's (the claim exempts a call with a variable of one or two letters among its arguments).
function show(v) {
  return v !== v ? "NaN" : Object.is(v, -0) ? "-0" : String(v);
}
function main(input) {
  var out = [];
  var r = [];
  r.push(Date.UTC(), Date.UTC(2020), Date.UTC(2020, 1), Date.UTC(2020, 1, 29), Date.UTC(2020, 1, 29, 23), Date.UTC(2020, 1, 29, 23, 59), Date.UTC(2020, 1, 29, 23, 59, 59), Date.UTC(2020, 1, 29, 23, 59, 59, 999), Date.UTC(2020, 1, 29, 23, 59, 59, 999, 12345));
  r.push(Date.UTC(1970), Date.UTC(1970, 0, 1, 0, 0, 0, 0), Date.UTC(1969, 11, 31, 23, 59, 59, 999), Date.UTC(1970, 0, 1, 0, 0, 0, -1), Date.UTC(1970, 0, 0), Date.UTC(1970, -1), Date.UTC(1969, 12));
  // Years 0..99.
  r.push(Date.UTC(0), Date.UTC(1), Date.UTC(69), Date.UTC(70), Date.UTC(99), Date.UTC(100), Date.UTC(-1), Date.UTC(99.9), Date.UTC(0.5), Date.UTC(-0.5), Date.UTC(-0), Date.UTC(99, 12), Date.UTC(100, -1), Date.UTC(-1, 12), Date.UTC(50, 600));
  // Leap years.
  r.push(Date.UTC(1900, 1, 29), Date.UTC(1900, 2, 1), Date.UTC(2000, 1, 29), Date.UTC(2000, 2, 1), Date.UTC(2100, 1, 29), Date.UTC(2100, 2, 1), Date.UTC(2024, 1, 29), Date.UTC(2023, 1, 29), Date.UTC(1600, 1, 29), Date.UTC(1700, 1, 29), Date.UTC(400, 1, 29), Date.UTC(-4, 1, 29), Date.UTC(-100, 1, 29), Date.UTC(-400, 1, 29), Date.UTC(2024, 11, 31), Date.UTC(2023, 11, 31));
  for (var m = 0; m < 12; m++) r.push(Date.UTC(2023, m), Date.UTC(2024, m), Date.UTC(1900, m, 31), Date.UTC(2000, m, 0));
  // Carrying.
  r.push(Date.UTC(2020, 12), Date.UTC(2020, 13, 1), Date.UTC(2020, -1), Date.UTC(2020, -12), Date.UTC(2020, -13), Date.UTC(2020, 24), Date.UTC(2020, 25, 32), Date.UTC(2020, 0, 0), Date.UTC(2020, 0, -1), Date.UTC(2020, 0, 366), Date.UTC(2020, 0, 367), Date.UTC(2020, 0, 1, 24), Date.UTC(2020, 0, 1, -1), Date.UTC(2020, 0, 1, 0, 60), Date.UTC(2020, 0, 1, 0, -1), Date.UTC(2020, 0, 1, 0, 0, 60), Date.UTC(2020, 0, 1, 0, 0, -1), Date.UTC(2020, 0, 1, 0, 0, 0, 1000), Date.UTC(2020, 0, 1, 0, 0, 0, -1));
  r.push(Date.UTC(2020, 0, 1, 1e6), Date.UTC(2020, 0, 1, 0, 1e9), Date.UTC(2020, 0, 1, 0, 0, 1e11), Date.UTC(2020, 0, 1, 0, 0, 0, 1e14), Date.UTC(2020, 0, 1e6), Date.UTC(2020, 1e4), Date.UTC(2020, -1e4, -1e5, -1e5, -1e7, -1e9, -1e12), Date.UTC(1970, 0, 1, 0, 0, 0, 8.64e15), Date.UTC(1970, 0, 1, 0, 0, 0, -8.64e15), Date.UTC(1970, 0, 1, 0, 0, 0, 8.64e15 + 1), Date.UTC(1970, 0, 1, 0, 0, 1, 8.64e15 - 1000));
  // Fractions truncate toward zero.
  r.push(Date.UTC(2020.9, 1.9, 2.9, 3.9, 4.9, 5.9, 6.9), Date.UTC(2020, -0.9, 1.5, -0.5, -0.9, -0.1, -0.999), Date.UTC(-2020.9, -1.9, -2.9, -3.9, -4.9, -5.9, -6.9), Date.UTC(1970, 0, 1, 0, 0, 0, 0.5), Date.UTC(1970, 0, 1, 0, 0, 0, -0.5), Date.UTC(1970, 0, 1, 0, 0, -0), Date.UTC(1970, -0, 1, -0, -0, -0, -0));
  // The ends of the range.
  r.push(Date.UTC(275760, 8, 13), Date.UTC(275760, 8, 13, 0, 0, 0, 1), Date.UTC(275760, 8, 12, 23, 59, 59, 999), Date.UTC(275760, 8, 14), Date.UTC(-271821, 3, 20), Date.UTC(-271821, 3, 20, 0, 0, 0, -1), Date.UTC(-271821, 3, 19), Date.UTC(-271821, 3, 20, 0, 0, 0, 1), Date.UTC(275760, 0), Date.UTC(-271821, 11), Date.UTC(275760, 11), Date.UTC(-271821, 0), Date.UTC(275760, 9, 1, 0, 0, 0, -3e9), Date.UTC(200000, 12 * 75760 + 8, 13), Date.UTC(275761, -4, 13));
  // Not finite, not numbers.
  r.push(Date.UTC(NaN), Date.UTC(Infinity), Date.UTC(-Infinity), Date.UTC(2020, NaN), Date.UTC(2020, 0, Infinity), Date.UTC(2020, 0, 1, NaN), Date.UTC(2020, 0, 1, 0, -Infinity), Date.UTC(2020, 0, 1, 0, 0, NaN), Date.UTC(2020, 0, 1, 0, 0, 0, Infinity), Date.UTC(undefined), Date.UTC(2020, undefined), Date.UTC(2020, 0, undefined), Date.UTC(2020, 0, 1, 0, 0, 0, undefined));
  r.push(Date.UTC(null), Date.UTC("2020"), Date.UTC("2020", "1", "2", "3", "4", "5", "6"), Date.UTC(true, false), Date.UTC(2020, null, null, null), Date.UTC(""), Date.UTC("x"), Date.UTC(2020, "x"), Date.UTC([2020], [5]), Date.UTC("0x7e4", " 3 "), Date.UTC(2020, 0, 1, "12", "30"));
  for (var i = 0; i < r.length; i++) out.push(show(r[i]));
  out.push(new Date(Date.UTC(2024, 1, 29, 12, 30, 15, 250)).toISOString(), Date.UTC(2021, 0, 1) - Date.UTC(2020, 0, 1), (Date.UTC(2020, 2, 1) - Date.UTC(2020, 1, 1)) / 86400000);
  // A runtime argument: the runtime's own call.
  out.push(show(Date.UTC(input)), show(Date.UTC(input, 5, 15)), show(Date.UTC(2020, input)), show(Date.UTC(2020, 0, 1, 0, 0, 0, input)));
  return out;
}
