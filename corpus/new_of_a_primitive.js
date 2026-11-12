// inputs: [0, 1, 2]
// `new` of a value known to be a primitive (no constructor) throws a
// TypeError, as at runtime; a later one of a constructor still constructs.
function main(i) {
  const out = [];
  for (const K of [undefined, 5, "s", null, true]) {
    try { out.push(new K(i)); } catch (e) { out.push(e.name); }
  }
  out.push(new Date(i * 1000).getTime());
  return out;
}
