function compile(program) {
  "use strict";
  let b, a, c;
  b = codegen.buffer();
  a = codegen.reference("io");
  c = codegen.prepare(b, a, "print");
  a = codegen.reference("io");
  a = [codegen.call(b, a, "prompt", [])];
  a = codegen.invoke(b, c, a);
  return codegen.finish(b, a);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
