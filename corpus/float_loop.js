// inputs: [0, 1, 3, 10]
// max-lines: 12
// A float accumulator over a dynamic trip count.
function main(n) {
  var acc = 1.5;
  for (var i = 0; i < n; i++) acc = acc * 0.5 + 0.25;
  return acc;
}
