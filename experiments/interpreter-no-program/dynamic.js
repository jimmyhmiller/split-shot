// A tiny language: opcode 0 increments; any other opcode doubles.
function interpret(program, value) {
  if (program === 0) return value + 1;
  return value * 2;
}
function main(input) {
  return interpret(input[0], input[1]);
}
