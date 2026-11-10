// inputs: [0, 1, 3, 6]
// Top-level state mutated by functions, under a dynamic loop.
var count = 0;
let log = [];
function tick(k) { count = count + k; log.push(k); }
function main(n) {
  for (var j = 0; j < n; j++) tick(j);
  return [count, log.length, typeof this];
}
