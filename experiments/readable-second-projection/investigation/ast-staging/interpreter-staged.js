function interp(program, io) {
  return program.reduce(function(value, instruction) {
    if (instruction === "prompt") {
      return io.prompt();
    }
    io.print(value);
    return value;
  }, null);
}
