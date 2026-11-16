// Partial evaluation for effect-only interpreters: source-program control is
// static to the inner specializer; host-call results are dynamic and may be
// passed to later host calls or returned. Interpreters must not inspect them.
// The host ABI supplies method names, not opcode/code-generation rules.
function residualArgument(value) {
  if (value !== null && typeof value === "object" && value.dynamic === true) {
    return value.source;
  }
  return JSON.stringify(value);
}
function residualMethod(method, effects) {
  return function() {
    var name = "v" + effects.length;
    var args = "";
    var i = 0;
    while (i < arguments.length) {
      if (i > 0) { args = args + ", "; }
      args = args + residualArgument(arguments[i]);
      i = i + 1;
    }
    effects.push("var " + name + " = io." + method + "(" + args + ");\n");
    return { dynamic: true, source: name };
  };
}
function effectMix(interpreter, program, methods) {
  var effects = [];
  var host = {};
  var i = 0;
  while (i < methods.length) {
    host[methods[i]] = residualMethod(methods[i], effects);
    i = i + 1;
  }
  var value = interpreter(program, host);
  return "function run(io) {\n" + effects.join("") + "return " + residualArgument(value) + ";\n}";
}

// Instructions: "prompt" reads text; "print" prints the latest text.
function interp(program, io) {
  var value = null;
  while (program.length > 0) {
    var instruction = program[0];
    if (instruction === "prompt") {
      value = io.prompt();
    } else if (instruction === "print") {
      io.print(value);
    } else {
      throw new Error("Unknown instruction: " + instruction);
    }
    program = program.slice(1);
  }
  return value;
}

function main(program) { return effectMix(interp, program, ["prompt","print"]); }
