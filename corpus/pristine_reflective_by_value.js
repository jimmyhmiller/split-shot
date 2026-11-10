// inputs: [0, 3]
// A reflective built-in called by value (`const d = Object.defineProperty`),
// through `.call`, and bound (`Function.prototype.bind.call(..)`) writes what
// it is given: Array.prototype here.
function main(n) {
  const d = Object.defineProperty;
  d(Array.prototype, "pv1", { value: n + 1, configurable: true });
  Object.defineProperty.call(null, Array.prototype, "pv2", { value: n + 2, configurable: true });
  const bound = Function.prototype.bind.call(Object.defineProperty, null, Array.prototype);
  bound("pv3", { value: n + 3, configurable: true });
  const r = [[].pv1, [].pv2, [].pv3];
  delete Array.prototype.pv1;
  delete Array.prototype.pv2;
  delete Array.prototype.pv3;
  return r;
}
