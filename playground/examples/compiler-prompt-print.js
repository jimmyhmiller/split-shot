// The second Futamura projection, mix(jsmix, interpreter) = compiler.
//
// jsmix (jsmix.js) is a specializer for a subset of JavaScript. main parses
// this interpreter's own source (subset-parse.js), works out what is static
// and what is dynamic in it (binding-times.js), and runs jsmix on it with the
// program unknown. split-shot specializes main, so what comes out is a
// compiler: give it a program and it returns target code. The target code is
// built with codegen.* helpers (experiments/general-jsmix/codegen.cjs), which
// are not part of this program, so the calls to them stay in the compiler.

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

function main(program) {
  var INT = analyze(parseProgram(interp.toString()), "interp");
  return jsmix(INT, "interp", program);
}
