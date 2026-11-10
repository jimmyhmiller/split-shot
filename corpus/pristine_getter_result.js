// inputs: [0, 2]
// What a getter defined with Object.defineProperty returns is what reading
// the property gives: writing through it writes that (Array.prototype).
function main(n) {
  const o = {};
  Object.defineProperty(o, "p", { get() { return Array.prototype; } });
  o.p.gz = n;
  const r = [[].gz];
  delete Array.prototype.gz;
  return r;
}
