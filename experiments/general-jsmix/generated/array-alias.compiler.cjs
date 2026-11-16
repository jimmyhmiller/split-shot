function compile(e) {
  let b, a, c, d;
  b = codegen.buffer();
  a = codegen.reference("io");
  c = codegen.call(b, a, "prompt", []);
  a = codegen.reference("io");
  a = [c, codegen.call(b, a, "prompt", [])];
  a = codegen.array(a);
  a = codegen.bindExpression(b, a).source;
  c = codegen.reference("io");
  d = [codegen.reference(a)];
  codegen.call(b, c, "print", d);
  a = codegen.reference(a);
  return codegen.finish(b, a);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
