function main(input) {
  var sum = 0;
  for (var i = 0; i < 12; i++) {
    if (i === input) break;
    if (i % 2 === 0) continue;
    sum += i;
    if (sum > 20) return sum;
  }
  return sum;
}
