// inputs: [[1, 2], [3], []]
// A stable global function handed out from a callback is the one object
// the program has: compared with itself, called through, and its
// properties (written at load) read at runtime.
function twice(x) { return x * 2; }
twice.label = "double";
function main(xs) {
  Object.hasOwn(xs, "length");
  const fs = xs.map(() => twice);
  return [fs.every((f) => f === twice), fs.map((f, i) => f(xs[i])), fs.map((f) => f.label).join(","), twice.label];
}
