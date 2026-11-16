function compile(program) {
  "use strict";
  let b, actualArg, a, parameter, assigned, c;
  b = codegen.buffer();
  actualArg = program[0];
  a = codegen.reference("io");
  parameter = codegen.call(b, a, "prompt", []).source;
  a = codegen.reference(parameter);
  a = codegen.binary("*", a, actualArg);
  assigned = codegen.bindExpression(b, a).source;
  a = codegen.reference("io");
  c = [codegen.reference(assigned)];
  codegen.call(b, a, "print", c);
  a = codegen.reference(assigned);
  return codegen.finish(b, a);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
