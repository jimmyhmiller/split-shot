// inputs: [0, 4]
// forbid: forEach|\.map\(|\.call\(|typeof
// A static method of a standard global passed as a callback is the modeled
// method: `typeof Object.freeze` is "function", and `Object.freeze.call(t,
// o, k, arr)` (how the prelude's forEach invokes it) is `Object.freeze(o)`,
// extra arguments ignored. engine262 runs `FEATURES.forEach(Object.freeze)`
// at module initialization; a runtime forEach there escaped the features.
function main(x) {
  const FEATURES = [{ name: "a", flag: 1 }, { name: "b", flag: 2 }];
  FEATURES.forEach(Object.freeze);
  const keys = [{ p: 1, q: 2 }, { r: 3 }].map(Object.keys);
  const low = Math.min.call(undefined, 5, 2, 8);
  const kinds = [typeof Object.freeze, typeof Math.max, typeof JSON.stringify, typeof Number.isInteger];
  return [Object.isFrozen(FEATURES[0]), Object.isFrozen(FEATURES[1]), FEATURES[1].flag + x, keys.join(";"), low, kinds.join(" ")].join(",");
}
