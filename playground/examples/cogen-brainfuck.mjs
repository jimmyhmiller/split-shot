// The third Futamura projection on Brainfuck.
//
// mix specializes flowchart programs. Applying it to its own flowchart
// produces COGEN, a compiler generator. Running COGEN on the interpreter
// below produces COMPILER. split-shot evaluates both stages at load time
// and specializes runFlowchart to COMPILER: the residual main is a plain
// JavaScript compiler, taking an unknown Brainfuck program and returning
// its target flowchart. No evaluator runs inside the residual compiler.
//
// To execute a returned target: runFlowchart(main(",."), [[65]]) gives [65].
// The compiler handles all eight instructions, including nested loops.
// This interpreter uses sixteen byte cells; programs must stay on the tape
// and supply every input byte they read. See brainfuck-cases.cjs for examples.

const INTERPRETER = toFlowchart(parseProgram(brainfuck.toString())[0]);
const MIX = toFlowchart(parseProgram(mix.toString())[0]);
const MIX_DIVISION = division(MIX, ["program", "division"], ["n"]);
const DIVISION = division(INTERPRETER, ["program"], ["ptr"]);
const COGEN = mix(MIX, MIX_DIVISION,
  initial(MIX_DIVISION, { program: MIX, division: MIX_DIVISION }));
const COMPILER = deepFreeze(runFlowchart(COGEN,
  [initial(MIX_DIVISION, { program: INTERPRETER, division: DIVISION })]));
const ENTRY = initial(DIVISION, {});
const PROGRAM = DIVISION.indexOf("program");

export function main(program) {
  return runFlowchart(COMPILER, [setAt(ENTRY, PROGRAM, program)]);
}
