function compile(c) {
  let b, a;
  b = codegen.buffer();
  a = codegen.reference("io");
  codegen.call(b, a, "print", ["quote: \" and newline: \n"]);
  a = c[0];
  return codegen.finish(b, a);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
