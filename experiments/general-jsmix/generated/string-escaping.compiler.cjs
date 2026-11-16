function compile(program) {
  "use strict";
  let a, b, returned;
  a = codegen.buffer();
  b = codegen.reference("io");
  codegen.call(a, b, "print", ["quote: \" and newline: \n"]);
  returned = program[0];
  return codegen.finish(a, returned);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
