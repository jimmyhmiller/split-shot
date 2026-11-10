// inputs: [1, 0]
// forbid-return: prototype|===
// Values of one intrinsic method are one function however each was read
// (they folded to unequal: two modeled values of it).
function main(x) {
  const o = {};
  const a = [x];
  return [
    o.toString === Object.prototype.toString,
    a.push === Array.prototype.push,
    a.pop === [].pop,
    a.map === a.filter,
    new Set().add === Set.prototype.add,
    x,
  ].join();
}
