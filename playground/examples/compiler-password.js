// The second Futamura projection, mix(jsmix, interpreter) = compiler.
//
// jsmix (jsmix.js) is a specializer for a subset of JavaScript. main parses
// this interpreter's own source (subset-parse.js), works out what is static
// and what is dynamic in it (binding-times.js), and runs jsmix on it with the
// program unknown. split-shot specializes main, so what comes out is a
// compiler: give it a program and it returns target code. The target code is
// built with codegen.* helpers (experiments/general-jsmix/codegen.cjs), which
// are not part of this program, so the calls to them stay in the compiler.

// The program is a password; the input is what the user types. The test
// compares a dynamic value, so the compiler emits a residual if/else.
function interp(program, io) {
  var answer = io.prompt();
  if (answer === program[0]) {
    io.print("welcome");
    return "accepted";
  }
  io.print("wrong password");
  return "rejected";
}

function main(program) {
  var INT = analyze(parseProgram(interp.toString()), "interp");
  return jsmix(INT, "interp", program);
}
