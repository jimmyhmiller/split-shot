function compile(program) {
  "use strict";
  let b, a, c, d;
  b = codegen.buffer();
  a = codegen.reference("io");
  c = codegen.prepare(b, a, "send");
  a = codegen.reference("io");
  a = codegen.property(a, "value");
  d = codegen.bindExpression(b, a);
  a = codegen.reference("io");
  a = [d, codegen.call(b, a, "prompt", [])];
  a = codegen.invoke(b, c, a);
  return codegen.finish(b, a);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
