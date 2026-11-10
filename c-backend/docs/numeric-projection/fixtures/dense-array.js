function main(input) {
  var values = [input, 2, 3, 4];
  var alias = values;
  var total = 0;
  for (var i = 0; i < values.length; i = i + 1) {
    alias[i] = values[i] + i * input;
    total = total + values[i];
  }
  return total / values.length;
}
