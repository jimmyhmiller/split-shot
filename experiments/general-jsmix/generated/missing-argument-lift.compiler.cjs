function compile(program) {
  "use strict";
  let b, a, c, parameter, actualArg;
  b = codegen.buffer();
  a = codegen.reference("io");
  c = codegen.prepare(b, a, "print");
  a = codegen.reference("io");
  parameter = codegen.call(b, a, "prompt", []).source;
  a = codegen.reference(parameter);
  a = [codegen.bindExpression(b, a)];
  codegen.invoke(b, c, a);
  a = codegen.reference("io");
  c = codegen.prepare(b, a, "print");
  parameter = codegen.literal(void 0).source;
  a = codegen.reference(parameter);
  a = [codegen.bindExpression(b, a)];
  codegen.invoke(b, c, a);
  actualArg = program[0];
  parameter = codegen.literal(actualArg).source;
  a = codegen.reference(parameter);
  return codegen.finish(b, a);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
