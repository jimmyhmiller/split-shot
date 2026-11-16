function compile(program) {
  "use strict";
  let c, assigned, b, a, right, d;
  c = codegen.buffer();
  assigned = codegen.literal(0).source;
  b = program;
  while (b["length"] > 0) {
    a: {
      if (b[0][0] === "get") {
        a = codegen.reference("io");
        assigned = codegen.call(c, a, "fetch", []).source;
        break a;
      }
      if (b[0][0] === "scale") {
        a = codegen.reference(assigned);
        right = b[0][1];
        a = codegen.binary("*", a, right);
        assigned = codegen.bindExpression(c, a).source;
        break a;
      }
      if (b[0][0] === "literal") {
        assigned = b[0][1];
        assigned = codegen.literal(assigned).source;
        break a;
      }
      a = codegen.reference("io");
      d = [codegen.reference(assigned)];
      codegen.call(c, a, "send", d);
    }
    b = b.slice(1);
  }
  a = codegen.reference(assigned);
  return codegen.finish(c, a);
}

const codegen = require("../codegen.cjs");
module.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};
