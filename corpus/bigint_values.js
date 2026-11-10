// inputs: [0, 2, 5]
// after: [String(globalThis.big.inc(5n)), String(globalThis.big.inc(4)), String(globalThis.big.dec(10n)), String(globalThis.big.post({ v: 3n })), typeof globalThis.big.lit].join("|")
// BigInt values are runtime values (literals pass through); ++/-- work on a
// BigInt as on a Number (`x - 0 + 1` threw for a BigInt), including in a
// residual function called later with one.
function main(n) {
  function inc(x) { let y = x; y++; return y; }
  function dec(x) { return --x; }
  function post(o) { const old = o.v++; return [old, o.v].join(","); }
  let m = 10n;
  m++;
  m *= 3n;
  const errs = [];
  try { errs.push(String(m + 1)); } catch (e) { errs.push(e.name); }
  try { errs.push(String(+m)); } catch (e) { errs.push(e.name); }
  try { 5n + 1; } catch (e) { errs.push(e.name); }
  globalThis.big = { inc, dec, post, lit: 0x1fn };
  return [typeof m, String(m), String(inc(n)), String(2n ** 70n), 1n < 2, 0n == 0, errs.join(","), String(-(-7n)), String(post({ v: n }))].join("|");
}
