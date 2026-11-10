import interp from "../../../js-frontend/examples/interp.js?raw";
import brainfuck from "../../../js-frontend/examples/brainfuck.js?raw";
import vm from "../../examples/vm.js?raw";
import power from "../../examples/power.js?raw";
import horner from "../../examples/horner.js?raw";
import format from "../../examples/format.js?raw";
import jsfuck from "../../examples/jsfuck.js?raw";

export const P1_EXAMPLES = [
  { id: "interp", title: "Expression interpreter", src: interp, input: "4",
    blurb: "A tree-walking interpreter specialized to one AST. The interpreter disappears and only the arithmetic is left." },
  { id: "brainfuck", title: "Brainfuck", src: brainfuck, input: "59",
    blurb: "A Brainfuck interpreter specialized to a fixed program. The tape, the loop and the dispatch all fold away." },
  { id: "vm", title: "Bytecode VM", src: vm, input: "10",
    blurb: "A VM loop with a program counter and jumps. The dispatch folds away and the residual is the loop the bytecode describes." },
  { id: "power", title: "power(x, 5)", src: power, input: "3",
    blurb: "The textbook example. Recursion on the static exponent unrolls into multiplications." },
  { id: "horner", title: "Polynomial", src: horner, input: "2",
    blurb: "Horner's rule over static coefficients unrolls into one expression." },
  { id: "format", title: "printf", src: format, input: "7",
    blurb: "A formatter specialized to its format string. The parsing happens at specialization time." },
  { id: "jsfuck", title: "JSFuck", src: jsfuck, input: "5",
    blurb: "JavaScript written with only []()!+. Every coercion runs at specialization time." },
];
