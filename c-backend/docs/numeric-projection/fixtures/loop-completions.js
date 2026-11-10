function main(input) {
  var total = 0;
  for (var i = 0; i < input; i = i + 1) {
    if (i === 2) continue;
    if (i === 7) break;
    total = total + i;
  }
  var j = 0;
  while (j < input) {
    j = j + 1;
    if (j === 3) continue;
    if (j === 9) return total + j;
    total = total - 0.5;
  }
  return total;
}
