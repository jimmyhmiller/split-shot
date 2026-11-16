// Same effect-only staging contract as effect-mix.js. The free `codegen`
// binding is supplied by a compiler-time module whose implementation is not
// part of the outer specialization input. This is an explicit module boundary.
function residualMethod(method, lines) {
  return function() {
    var args = [];
    var i = 0;
    while (i < arguments.length) {
      args.push(arguments[i]);
      i = i + 1;
    }
    return codegen.emit(lines, method, args);
  };
}
function effectMix(interpreter, program, methods) {
  var lines = [];
  var host = {};
  var i = 0;
  while (i < methods.length) {
    host[methods[i]] = residualMethod(methods[i], lines);
    i = i + 1;
  }
  var value = interpreter(program, host);
  return codegen.finish(lines, value);
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

function main(program) { return effectMix(interp, program, ["prompt", "print"]); }
