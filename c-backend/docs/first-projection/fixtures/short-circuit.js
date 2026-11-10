function main(input) {
  var n = 0;
  var a = input && ++n;
  var b = input || ++n;
  var c = input ?? ++n;
  return [n, a, b, c];
}
