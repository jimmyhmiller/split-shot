// inputs: [0, 4]
// A built-in's callback is given what the built-in has: the elements of the
// array `forEach` iterates (Array.prototype here), a reduce's accumulator.
function main(n) {
  [Array.prototype].forEach((p) => { p.cb1 = n; });
  [1].reduce((acc) => { acc.cb2 = n + 1; return acc; }, Object.prototype);
  const r = [[].cb1, ({}).cb2];
  delete Array.prototype.cb1;
  delete Object.prototype.cb2;
  return r;
}
