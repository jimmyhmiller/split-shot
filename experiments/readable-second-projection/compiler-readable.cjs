function compile(program) {
  let remaining, value, lines, text, name;
  remaining = program;
  value = null;
  lines = [];
  while (remaining.length > 0) {
    text = remaining[0];
    if (text === "prompt") {
      name = "v" + lines.length;
      lines.push("var " + name + " = io.prompt();\n");
      value = {
        dynamic: true,
        source: name
      };
    } else if (text === "print") {
      name = "v" + lines.length;
      text = value !== null && typeof value === "object";
      if (text && value.dynamic === true) {
        text = "" + value.source;
      } else {
        text = "" + JSON.stringify(value);
      }
      lines.push("var " + name + " = io.print(" + text + ");\n");
    } else {
      throw new Error("Unknown instruction: " + text);
    }
    remaining = remaining.slice(1);
  }
  remaining = lines.join("");
  text = value !== null && typeof value === "object";
  if (text && value.dynamic === true) {
    return "function run(io) {\n" + remaining + "return " + value.source + ";\n}";
  }
  value = JSON.stringify(value);
  return "function run(io) {\n" + remaining + "return " + value + ";\n}";
}

module.exports = { compile, run: function(program, io) { return Function("return (" + compile(program) + ");")()(io); } };
