function compile(d) {
  let c, b, a, e;
  c = codegen.buffer();
  b = d[0];
  a = codegen.reference("io");
  a = codegen.call(c, a, "prompt", []).source;
  a = codegen.reference(a);
  b = codegen.binary("*", a, b);
  b = codegen.bindExpression(c, b).source;
  a = codegen.reference("io");
  e = [codegen.reference(b)];
  codegen.call(c, a, "print", e);
  a = codegen.reference(b);
  return codegen.finish(c, a);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
