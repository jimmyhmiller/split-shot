function compile(c) {
  let b, a, d, e;
  a: {
    b = codegen.buffer();
    if (c[0]) {
      a = codegen.literal(1);
      a = codegen.bindExpression(b, a).source;
      break a;
    }
    a = codegen.reference("io");
    a = codegen.call(b, a, "prompt", []);
    a = codegen.bindExpression(b, a).source;
  }
  d = codegen.reference("io");
  e = [codegen.reference(a)];
  codegen.call(b, d, "print", e);
  a = codegen.reference(a);
  return codegen.finish(b, a);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
