function __rf0(a) {
  let b;
  b = a !== null ? typeof a === "object" : a !== null;
  if (b ? a.dynamic === true : b) {
    return a.source;
  }
  return JSON.stringify(a);
}

function compile(f) {
  let c, a, d, b, e, g;
  c = f;
  a = null;
  d = [];
  while (c.length > 0) {
    a: {
      if (c[0] === "get") {
        e = "v" + d.length;
        d.push("var " + e + " = io.fetch();\n");
        a = {dynamic: true, source: e};
        break a;
      }
      if (c[0] === "repeat") {
        b: {
          e = "v" + d.length;
          b = a !== null ? typeof a === "object" : a !== null;
          if (b ? a.dynamic === true : b) {
            b = "" + a.source;
            break b;
          }
          b = "" + JSON.stringify(a);
        }
        g = __rf0(a);
        b = b + ", " + g;
        d.push("var " + e + " = io.send(" + b + ");\n");
        break a;
      }
      e = "v" + d.length;
      d.push("var " + e + " = io.send(\"literal text\");\n");
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
