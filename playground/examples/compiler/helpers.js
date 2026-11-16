// Interpreter functions may call each other: here `scale` is applied to a
// static factor and a dynamic reading.
function scale(amount, value) {
  return value * amount;
}

function interp(program, io) {
  var total = 0;
  while (program.length > 0) {
    total = total + scale(program[0], io.prompt());
    program = program.slice(1);
  }
  io.print(total);
  return total;
}
