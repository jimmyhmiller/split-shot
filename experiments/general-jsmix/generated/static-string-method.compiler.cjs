function compile(e) {
  let b, a, c, d;
  b = codegen.buffer();
  a = codegen.call(b, "hello", "toUpperCase", []).source;
  c = codegen.reference("io");
  d = [codegen.reference(a)];
  codegen.call(b, c, "print", d);
  a = codegen.reference(a);
  return codegen.finish(b, a);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
