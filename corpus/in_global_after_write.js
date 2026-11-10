// inputs: [0, 1, 5]
// `"x" in globalThis` reads the global object: a global the program
// assigned is there (folded when known), and the test runs after the
// pending global writes.
function main(n) {
  if (n > 0) {
    probeA = 1;
  }
  var r1 = "probeA" in globalThis;
  probeB = 2;
  var r2 = "probeB" in globalThis;
  var r3 = "probeNever" in globalThis;
  return [r1, r2, r3].join(",");
}
