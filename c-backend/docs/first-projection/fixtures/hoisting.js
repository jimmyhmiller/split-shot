function main(input) {
  var before = later;
  var later = 9;
  function add(a, b) { var a; return [a + input, b]; }
  return [before, add(3), later];
}
