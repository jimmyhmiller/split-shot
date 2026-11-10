function main(input) {
  var total = 0;
  for (var i = 0; i < input; i = i + 1) total = total + i * 0.5;
  var j = input;
  while (j > 0) { total = total - j / 4; j = j - 1; }
  return total;
}
