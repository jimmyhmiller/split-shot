function compile(c) {
  let b, a;
  b = codegen.buffer();
  a = codegen.reference("io");
  a = codegen.call(b, a, "prompt", []);
  a = codegen.unary("-", a);
  return codegen.finish(b, a);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
