function compile(program) {
  "use strict";
  let b, a, assigned, c;
  b = codegen.buffer();
  if (program[0]) {
    a = codegen.literal(1);
    assigned = codegen.bindExpression(b, a).source;
    a = codegen.reference("io");
    c = [codegen.reference(assigned)];
    codegen.call(b, a, "print", c);
    a = codegen.reference(assigned);
    return codegen.finish(b, a);
  }
  a = codegen.reference("io");
  a = codegen.call(b, a, "prompt", []);
  assigned = codegen.bindExpression(b, a).source;
  a = codegen.reference("io");
  c = [codegen.reference(assigned)];
  codegen.call(b, a, "print", c);
  a = codegen.reference(assigned);
  return codegen.finish(b, a);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
