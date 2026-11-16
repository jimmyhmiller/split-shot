function compile(f) {
  let c, a, d, b, e;
  c = f;
  a = null;
  d = [];
  while (c.length > 0) {
    a: {
      b = c[0];
      if (b === "prompt") {
        e = "v" + d.length;
        d.push("var " + e + " = io.prompt();\n");
        a = {dynamic: true, source: e};
        break a;
      }
      if (b === "print") {
        b: {
          e = "v" + d.length;
          b = a !== null ? typeof a === "object" : a !== null;
          if (b ? a.dynamic === true : b) {
            b = "" + a.source;
            break b;
          }
          b = "" + JSON.stringify(a);
        }
        d.push("var " + e + " = io.print(" + b + ");\n");
        break a;
      }
      throw new Error("Unknown instruction: " + b);
    }
    c = c.slice(1);
  }
  c = d.join("");
  b = a !== null ? typeof a === "object" : a !== null;
  if (b ? a.dynamic === true : b) {
    return "function run(io) {\n" + c + "return " + a.source + ";\n}";
  }
  a = JSON.stringify(a);
  return "function run(io) {\n" + c + "return " + a + ";\n}";
}

module.exports = { compile, run: function(program, io) { return Function("return (" + compile(program) + ");")()(io); } };
