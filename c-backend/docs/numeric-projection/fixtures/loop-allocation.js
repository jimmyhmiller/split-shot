// At most 19 two-field records: bounded well below the 4096-element heap.
function main(input) {
  function Sample(x, y) { this.x = x; this.y = y; }
  var total = 0;
  for (var i = 0; i < input; i = i + 1) {
    var sample = new Sample(i, input - i);
    sample.x = sample.x + 0.5;
    total = total + sample.x * sample.y;
  }
  return total;
}
