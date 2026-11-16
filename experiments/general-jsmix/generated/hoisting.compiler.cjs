function compile(d) {
  let b, a, c;
  b = codegen.buffer();
  a = codegen.reference("io");
  c = [codegen.reference("undefined")];
  codegen.call(b, a, "print", c);
  a = codegen.reference("io");
  a = codegen.call(b, a, "prompt", []).source;
  a = codegen.reference(a);
  return codegen.finish(b, a);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
