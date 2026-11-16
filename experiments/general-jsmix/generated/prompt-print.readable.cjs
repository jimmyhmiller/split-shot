function compile(program) {
  let lines, temp, remaining, value, args;
  lines = codegen.buffer();
  temp = codegen.literal(null).source;
  remaining = program;
  value = temp;
  while (remaining.length > 0) {
    temp = remaining[0];
    if (temp === "prompt") {
      temp = codegen.reference("io");
      temp = codegen.call(lines, temp, "prompt", []).source;
      remaining = remaining.slice(1);
      value = temp;
      continue;
    }
    if (temp === "print") {
      temp = codegen.reference("io");
      args = [codegen.reference(value)];
      codegen.call(lines, temp, "print", args);
      remaining = remaining.slice(1);
      continue;
    }
    lines = "Unknown instruction: " + temp;
    throw new Error(lines);
  }
  temp = codegen.reference(value);
  return codegen.finish(lines, temp);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
