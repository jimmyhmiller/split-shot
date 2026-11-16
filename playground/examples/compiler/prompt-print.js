// Instructions: "prompt" reads text; "print" prints the latest text.
function interp(program, io) {
  var value = null;
  while (program.length > 0) {
    var instruction = program[0];
    if (instruction === "prompt") {
      value = io.prompt();
    } else if (instruction === "print") {
      io.print(value);
    } else {
      throw new Error("Unknown instruction: " + instruction);
    }
    program = program.slice(1);
  }
  return value;
}
