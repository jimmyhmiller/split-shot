function compile(program) {
  "use strict";
  let b, actualArg, a, parameter;
  b = codegen.buffer();
  actualArg = program[0];
  a = codegen.reference("io");
  parameter = codegen.call(b, a, "prompt", []).source;
  if (actualArg === 0) {
    a = codegen.literal(7);
    return codegen.finish(b, a);
  }
  a = codegen.reference(parameter);
  a = codegen.binary("+", a, 1);
  return codegen.finish(b, a);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
