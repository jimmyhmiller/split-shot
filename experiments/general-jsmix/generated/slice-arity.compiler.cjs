function compile(a) {
  let b, c;
  b = codegen.buffer();
  c = a.slice().slice(1, 3)[0];
  return codegen.finish(b, c);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
