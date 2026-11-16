function compile(e) {
  let b, a, c, d;
  b = codegen.buffer();
  a = codegen.reference("io");
  a = codegen.call(b, a, "prompt", []);
  a = codegen.binary("+", a, 1);
  a = codegen.bindExpression(b, a).source;
  c = codegen.reference("io");
  d = [codegen.reference(a)];
  codegen.call(b, c, "print", d);
  c = codegen.reference(a);
  a = codegen.reference(a);
  a = codegen.binary("+", c, a);
  return codegen.finish(b, a);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
