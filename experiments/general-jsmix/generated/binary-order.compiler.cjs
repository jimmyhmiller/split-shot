function compile(d) {
  let b, a, c;
  b = codegen.buffer();
  a = codegen.reference("io");
  a = codegen.property(a, "value");
  c = codegen.bindExpression(b, a);
  a = codegen.reference("io");
  a = codegen.call(b, a, "prompt", []);
  a = codegen.binary("+", c, a);
  return codegen.finish(b, a);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
