// The second Futamura projection, mix(jsmix, interpreter) = compiler.
//
// jsmix (jsmix.js) is a specializer for a subset of JavaScript. At load, this
// module parses the interpreter's own source (subset-parse.js) and works out
// what in it is static and what dynamic (binding-times.js). main runs jsmix on
// it with the program unknown, and split-shot specializes main: what comes
// out is a compiler. Give it a program and it returns target code, built with
// codegen.* helpers (experiments/general-jsmix/codegen.cjs) that are not part
// of this program, so the calls to them stay in the compiler.

// The interpreter (brainfuck.js) reads the program as text. Its loops run while
// the current cell is not zero, which is only known when the target runs, so
// each becomes a loop in the target: the compiler recurses on the brackets.

const INT = analyze(parseProgram(interp.toString() + "\n" + run.toString() + "\n" + matching.toString()), "interp");

export function main(program) {
  return jsmix(INT, "interp", program);
}
