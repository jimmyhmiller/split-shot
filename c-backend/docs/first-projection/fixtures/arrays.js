function main(input) {
  var a = [input, 2, 3];
  a[1] += a[0];
  var i = 0;
  var sum = 0;
  while (i < a.length) { sum += a[i]; i++; }
  return sum;
}
