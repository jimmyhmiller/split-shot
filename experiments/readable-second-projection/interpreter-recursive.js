function interp(program, io) {
  return run(program, null, io);
}
function run(program, value, io) {
  if (program.length === 0) {
    return value;
  }
  if (program[0] === "prompt") {
    return run(program.slice(1), io.prompt(), io);
  }
  io.print(value);
  return run(program.slice(1), value, io);
}
