// inputs: [0, 1, 3]
// for..of over an array whose contents depend on the input, and a destructured
// loop over a runtime (escaped) array.
function main(n) {
  var xs = [];
  for (var i = 0; i < n; i++) xs.push(i * 2);
  var total = 0;
  for (const x of xs) total += x;
  var pairs = xs.map(function (v, k) { return [k, v]; });
  var acc = "";
  for (const [k, v] of pairs) acc += k + ":" + v + ";";
  return [total, acc];
}
