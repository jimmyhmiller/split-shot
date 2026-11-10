function makeCounter(start) {
  return delta => { start += delta; return start; };
}
function main(input) {
  var counter = makeCounter(10);
  return counter(input) + counter(2);
}
