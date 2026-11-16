function compile(program) {
  "use strict";
  let c, assigned, b, d, a, e, value;
  c = codegen.buffer();
  assigned = codegen.literal(null).source;
  b = program;
  d = assigned;
  while (b["length"] > 0) {
    a: {
      assigned = b[0];
      if (assigned === "prompt") {
        a = codegen.reference("io");
        assigned = codegen.call(c, a, "prompt", []).source;
        d = assigned;
        break a;
      }
      if (assigned === "print") {
        a = codegen.reference("io");
        e = a;
        a = codegen.reference(d);
        codegen.call(c, e, "print", [a]);
        break a;
      }
      value = "Unknown instruction: " + assigned;
      throw new Error(value);
    }
    b = b.slice(1);
  }
  a = codegen.reference(d);
  return codegen.finish(c, a);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
