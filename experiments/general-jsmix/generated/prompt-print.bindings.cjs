function compile(program) {
  const lines = codegen.buffer();
  const literalSource = codegen.literal(null).source;
  let remaining = program;
  let value = literalSource;
  while (remaining.length > 0) {
    const remainingItem = remaining[0];
    if (remainingItem === "prompt") {
      const ioReference = codegen.reference("io");
      const callSource = codegen.call(lines, ioReference, "prompt", []).source;
      remaining = remaining.slice(1);
      value = callSource;
      continue;
    }
    if (remainingItem === "print") {
      const ioReference2 = codegen.reference("io");
      const args = [codegen.reference(value)];
      codegen.call(lines, ioReference2, "print", args);
      remaining = remaining.slice(1);
      continue;
    }
    const text = "Unknown instruction: " + remainingItem;
    throw new Error(text);
  }
  const valueReference = codegen.reference(value);
  return codegen.finish(lines, valueReference);
}
const codegen = require("../codegen.cjs");
module.exports = {
  compile: compile,
  run: function (program, io) {
    return Function("return (" + compile(program) + ");")()(io);
  }
};
