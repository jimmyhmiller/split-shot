// Finite arithmetic, remainder, unary negation, and square root.
function main(input) {
  var x = input * 1.25 - 0.5;
  return (x * x + 3) / 7 + input % 4 - Math.sqrt(input * input + 1);
}
