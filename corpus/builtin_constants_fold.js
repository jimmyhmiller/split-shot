// inputs: [0, 3]
// forbid: EPSILON|SAFE_INTEGER|MAX_VALUE|MIN_VALUE|Math\.|typeof
// The constants of the standard Math and Number (non-writable,
// non-configurable data properties) fold. engine262's bootstrapNumber checks
// `typeof x === 'number'` on each Number constant before wrapping it; a
// runtime read left that check, and the assertion's throw path, in the model.
function main(x) {
  function num(v) {
    if (typeof v !== "number") throw new Error("not a number");
    return v;
  }
  const n = [Number.EPSILON, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.MAX_VALUE, Number.MIN_VALUE, Number.NaN, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY].map(num);
  const m = [Math.E, Math.LN10, Math.LN2, Math.LOG10E, Math.LOG2E, Math.PI, Math.SQRT1_2, Math.SQRT2].map(num);
  return n.join(",") + "|" + m.join(",") + "|" + (Math.PI * x);
}
