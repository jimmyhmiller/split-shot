function compile(e) {
  let b, a, c, d;
  b = codegen.buffer();
  a = codegen.reference("io");
  a = codegen.call(b, a, "prompt", []).source;
  c = codegen.reference("io");
  d = [codegen.reference(a)];
  codegen.call(b, c, "print", d);
  a = codegen.reference(a).source;
  a = codegen.reference(a);
  return codegen.finish(b, a);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
