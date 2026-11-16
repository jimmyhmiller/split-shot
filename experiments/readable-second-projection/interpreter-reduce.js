function step(instruction, value, io) {
  if (instruction === "prompt") {
    return io.prompt();
  }
  io.print(value);
  return value;
}
function interp(program, io) {
  return program.reduce(function(value, instruction) {
    return step(instruction, value, io);
  }, null);
}
