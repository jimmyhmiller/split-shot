function main(input) {
  var a = [input, 2];
  var i = 0;
  a[i++] += (a[0] = 5, 3);
  return [a[0], i, input ? ++i : i++];
}
