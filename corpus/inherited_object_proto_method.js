// inputs: [1, "z"]
// forbid-main: \.call\(|"b" in
// Object.hasOwnProperty (inherited from Object.prototype through Function.prototype) is the modeled intrinsic, as Object.prototype.hasOwnProperty is: a for-in over own keys with hasOwnProperty.call folds (LiquidJS's forOwn).
var hasOwnProperty = Object.hasOwnProperty;
var hop2 = Object.prototype.hasOwnProperty;
function main(x) {
  const o = { a: 1, b: x };
  const keys = [];
  for (const k in o) if (hasOwnProperty.call(o, k)) keys.push(k);
  return [keys.join(","), hop2.call(o, "a"), hasOwnProperty === hop2, o.b];
}
