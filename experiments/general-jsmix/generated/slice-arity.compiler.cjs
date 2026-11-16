function compile(program) {
  "use strict";
  let a, returned;
  a = codegen.buffer();
  returned = program.slice().slice(1, 3)[0];
  return codegen.finish(a, returned);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
