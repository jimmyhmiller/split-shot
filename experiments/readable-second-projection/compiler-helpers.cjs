function compile(e) {
  let a, b, c, d;
  a = e;
  b = null;
  c = [];
  while (a.length > 0) {
    a: {
      d = a[0];
      if (d === "prompt") {
        b = codegen.emit(c, "prompt", []);
        break a;
      }
      if (d === "print") {
        codegen.emit(c, "print", [b]);
        break a;
      }
      throw new Error("Unknown instruction: " + d);
    }
    a = a.slice(1);
  }
  return codegen.finish(c, b);
}

const codegen = require("./codegen-helpers.cjs");
module.exports = {compile, run: function(program, io) { return Function("return (" + compile(program) + ");")()(io); }};
