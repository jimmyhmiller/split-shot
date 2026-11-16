function compile(program) {
  let remaining, value, lines, instruction;
  remaining = program;
  value = null;
  lines = [];
  while (remaining.length > 0) {
    instruction = remaining[0];
    if (instruction === "prompt") {
      value = codegen.emit(lines, "prompt", []);
    } else if (instruction === "print") {
      codegen.emit(lines, "print", [value]);
    } else {
      throw new Error("Unknown instruction: " + instruction);
    }
    remaining = remaining.slice(1);
  }
  return codegen.finish(lines, value);
}

const codegen = require("./codegen-helpers.cjs");
module.exports = {compile, run: function(program, io) { return Function("return (" + compile(program) + ");")()(io); }};
