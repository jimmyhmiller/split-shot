function compile(program) {
  "use strict";
  let b, a, right;
  b = codegen.buffer();
  a = codegen.reference("io");
  right = program[0];
  a = codegen.binary("+", a, right);
  return codegen.finish(b, a);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
