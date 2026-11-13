// inputs: [null, 0, {"rules": {"x": 1, "y": 2}}, {"rules": {}}]
// An operand of `&&`, `||`, `??` or `?:` runs only on the side that takes it:
// what specializing it would commit to the residual (here the read of a
// runtime value's property, kept for its exception when a known object is
// compared with it) happens only there.
function main(r) {
  const known = { k: 1 };
  var b = r && known === r.rules.x;
  var c = r ? known === r.rules.y : 7;
  var e = r ?? known.k;
  var f = !r || known !== r.rules;
  return [String(b), String(c), typeof e, String(f), known.k].join(",");
}
