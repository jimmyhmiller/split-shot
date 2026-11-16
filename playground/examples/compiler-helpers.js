// The second Futamura projection, mix(jsmix, interpreter) = compiler.
//
// jsmix (jsmix.js) is a specializer for a subset of JavaScript. main parses
// this interpreter's own source (subset-parse.js), works out what is static
// and what is dynamic in it (binding-times.js), and runs jsmix on it with the
// program unknown. split-shot specializes main, so what comes out is a
// compiler: give it a program and it returns target code. The target code is
// built with codegen.* helpers (experiments/general-jsmix/codegen.cjs), which
// are not part of this program, so the calls to them stay in the compiler.

// Interpreter functions may call each other: here `scale` is applied to a
// static factor and a dynamic reading.
function scale(amount, value) {
  return value * amount;
}

function interp(program, io) {
  var total = 0;
  while (program.length > 0) {
    total = total + scale(program[0], io.prompt());
    program = program.slice(1);
  }
  io.print(total);
  return total;
}

function main(program) {
  var INT = analyze(parseProgram(scale.toString() + "\n" + interp.toString()), "interp");
  return jsmix(INT, "interp", program);
}
