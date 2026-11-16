// The second Futamura projection, mix(jsmix, interpreter) = compiler.
//
// jsmix (jsmix.js) is a specializer for a subset of JavaScript. main parses
// this interpreter's own source (subset-parse.js), works out what is static
// and what is dynamic in it (binding-times.js), and runs jsmix on it with the
// program unknown. split-shot specializes main, so what comes out is a
// compiler: give it a program and it returns target code. The target code is
// built with codegen.* helpers (experiments/general-jsmix/codegen.cjs), which
// are not part of this program, so the calls to them stay in the compiler.

// A calculator over one register. "get" reads a number with io.fetch(),
// ["scale", k] multiplies by k, ["literal", v] sets the register, and anything
// else sends the register with io.send(value).
function interp(program, io) {
  var value = 0;
  while (program.length > 0) {
    var instruction = program[0];
    if (instruction[0] === "get") {
      value = io.fetch();
    } else if (instruction[0] === "scale") {
      value = value * instruction[1];
    } else if (instruction[0] === "literal") {
      value = instruction[1];
    } else {
      io.send(value);
    }
    program = program.slice(1);
  }
  return value;
}

function main(program) {
  var INT = analyze(parseProgram(interp.toString()), "interp");
  return jsmix(INT, "interp", program);
}
