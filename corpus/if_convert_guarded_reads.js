// inputs: [{"m": null}, {"m": [1, 2, 3]}, {"m": 0}]
// Reads an if arm makes of a value it knows is truthy are not evaluated before the condition (if-conversion used to hoist them to the join).
function main(input) {
  const out = [];
  const m = input.m;
  if (m) out.push(typeof m[2], m.k);
  return out;
}
