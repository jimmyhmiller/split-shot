function compile(b) {
  let c, a, d;
  c = codegen.buffer();
  a = codegen.reference("io");
  d = b[0];
  a = codegen.binary("+", a, d);
  return codegen.finish(c, a);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
