function compile(program) {
  "use strict";
  let b, a, assigned, c, parameter;
  b = codegen.buffer();
  a = codegen.reference("io");
  assigned = codegen.call(b, a, "prompt", []).source;
  a = codegen.reference("io");
  c = [codegen.reference(assigned)];
  codegen.call(b, a, "print", c);
  parameter = codegen.reference(assigned).source;
  a = codegen.reference(parameter);
  return codegen.finish(b, a);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
