// inputs: [0, 1]
// Keys from `for (k in o)` and `Object.keys(o)` are the keys of `o`: written
// to the global object, they replace the globals they name.
function main(n) {
  const saved = [globalThis.Math, globalThis.JSON];
  for (const k in { Math: 1 }) globalThis[k] = { max: () => "fake" + n };
  for (const k of Object.keys({ JSON: 1 })) globalThis[k] = { stringify: () => "json" + n };
  const r = [Math.max(1, 2), JSON.stringify(n)];
  globalThis.Math = saved[0];
  globalThis.JSON = saved[1];
  return r;
}
