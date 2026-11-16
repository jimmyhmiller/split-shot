function compile(program) {
  "use strict";
  let a, assigned, b, c;
  a = codegen.buffer();
  assigned = codegen.call(a, "hello", "toUpperCase", []).source;
  b = codegen.reference("io");
  c = [codegen.reference(assigned)];
  codegen.call(a, b, "print", c);
  b = codegen.reference(assigned);
  return codegen.finish(a, b);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
