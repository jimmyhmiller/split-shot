// A calculator over one register. "get" reads a number with io.fetch(),
// ["scale", k] multiplies by k, ["literal", v] sets the register, and anything
// else sends the register with io.send(value).
function interp(program, io) {
  var value = 0;
  while (program.length > 0) {
    var instruction = program[0];
    if (instruction[0] === "get") {
      value = io.fetch();
    } else if (instruction[0] === "scale") {
      value = value * instruction[1];
    } else if (instruction[0] === "literal") {
      value = instruction[1];
    } else {
      io.send(value);
    }
    program = program.slice(1);
  }
  return value;
}
