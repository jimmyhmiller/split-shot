// The same interpreter, now with a fixed program.
function interpret(program, value) {
  if (program === 0) return value + 1;
  return value * 2;
}
function main(value) {
  return interpret(0, value);
}
