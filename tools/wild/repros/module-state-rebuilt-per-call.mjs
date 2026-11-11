// First seen in the eventemitter3 case (a `once` listener stays removed in
// the original); that case passes on later builds, this program does not.
// In a program of modules, an object made at module load and written by
// `main` under a runtime key is made again inside the residual `main` on
// every call. (As a plain script, without `export`, the residual is right;
// so is a write under a fixed key, `counts.a += input`.)
//   original: main("a"), main("a") gives 1, 2
//   residual: 1, 1
const counts = { a: 0 };
export function main(input) {
  counts[input] = (counts[input] || 0) + 1;
  return counts[input];
}
