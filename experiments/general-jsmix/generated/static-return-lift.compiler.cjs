function compile(d) {
  let c, a, b;
  c = codegen.buffer();
  a = d[0];
  b = codegen.reference("io");
  b = codegen.call(c, b, "prompt", []).source;
  if (a === 0) {
    a = codegen.literal(7);
    return codegen.finish(c, a);
  }
  b = codegen.reference(b);
  a = codegen.binary("+", b, 1);
  return codegen.finish(c, a);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
