// inputs: [0, 2, 5]
// after: [String(globalThis.Saved), globalThis.Saved === globalThis.Orig, typeof globalThis.Number2].join("|")
// A global read into a local before the program reassigns that global keeps
// the old value (the read was left pending, so `new re(...)` used the new one).
function main(n) {
  globalThis.Orig = RegExp;
  let re = RegExp;
  RegExp = function () { throw new Error("replaced"); };
  RegExp = new re("ab+c" + n);
  globalThis.Saved = RegExp;
  RegExp = re;
  let num = Number;
  Number = null;
  globalThis.Number2 = num;
  const r = num("4") + n;
  Number = num;
  return [String(globalThis.Saved), r].join("|");
}
