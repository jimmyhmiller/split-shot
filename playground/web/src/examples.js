// The examples of each mode. Sources live in playground/examples (first and
// second projection) and docs/p3 (third), imported as text.
import power from "../../examples/specialize/power.js?raw";
import regex from "../../examples/specialize/regex.js?raw";
import poly from "../../examples/specialize/poly.js?raw";
import template from "../../examples/specialize/template.js?raw";
import format from "../../examples/specialize/format.js?raw";
import interp from "../../examples/specialize/interp.js?raw";
import vm from "../../examples/specialize/vm.js?raw";
import brainfuck from "../../examples/specialize/brainfuck.js?raw";
import jsfuck from "../../examples/specialize/jsfuck.js?raw";
import promptPrint from "../../examples/compiler/prompt-print.js?raw";
import arithmetic from "../../examples/compiler/arithmetic.js?raw";
import helpers from "../../examples/compiler/helpers.js?raw";
import guard from "../../examples/compiler/guard.js?raw";
import p3Int from "../../../docs/p3/int.js?raw";
import p3Vm from "../../../docs/p3/vm.js?raw";

// First projection. `args`: each parameter of `entry`, static (its value is
// known now and baked in) or dynamic (`value` is only a sample to run with).
// Values are JavaScript expressions.
export const SPECIALIZE = [
  { id: "power", title: "Power", src: power, entry: "power",
    args: { x: { dynamic: true, value: "3" }, n: { value: "5" } },
    blurb: "With the exponent known, the recursion unrolls into multiplications." },
  { id: "regex", title: "Regex matcher", src: regex, entry: "matches",
    args: { pattern: { value: '"a*b*c"' }, text: { dynamic: true, value: '"aabbc"' } },
    blurb: "A backtracking matcher specialized to one pattern: each residual function is a state of the matcher." },
  { id: "poly", title: "Polynomial", src: poly, entry: "poly",
    args: { coeffs: { value: "[3, 0, 2, 5]" }, x: { dynamic: true, value: "2" } },
    blurb: "Horner's rule over known coefficients becomes one expression." },
  { id: "template", title: "Template", src: template, entry: "render",
    args: { template: { value: '"Hello, {name}! You have {count} new messages."' }, data: { dynamic: true, value: '{ name: "Ada", count: 3 }' } },
    blurb: "The template is scanned at specialization time; the residual only concatenates." },
  { id: "format", title: "printf", src: format, entry: "format",
    args: { fmt: { value: '"x = %d, name = %s (100%% done)"' }, args: { dynamic: true, value: '[42, "Ada"]' } },
    blurb: "A formatter specialized to its format string: the parsing happens now." },
  { id: "interp", title: "Expression interpreter", src: interp, entry: "evaluate",
    args: {
      node: { value: '{ op: "mul",\n  l: { op: "add", l: { op: "var", name: "x" }, r: { op: "lit", val: 3 } },\n  r: { op: "add", l: { op: "var", name: "x" }, r: { op: "var", name: "y" } } }'.replace(/\n\s*/g, " ") },
      env: { dynamic: true, value: "{ x: 4, y: 5 }" },
    },
    blurb: "Specialize an interpreter to a program and the interpreter disappears: the first Futamura projection, by hand." },
  { id: "vm", title: "Bytecode VM", src: vm, entry: "run",
    args: { code: { value: '[["jz", 4], ["add"], ["dec"], ["jmp", 0], ["ret"]]' }, input: { dynamic: true, value: "10" } },
    blurb: "The VM loop runs a dynamic number of times, but the program counter is known on every path, so dispatch folds away." },
  { id: "brainfuck", title: "Brainfuck", src: brainfuck, entry: "brainfuck",
    args: { program: { value: '",[->++<]>."' }, input: { dynamic: true, value: "[21]" } },
    blurb: "The program text is parsed and walked at specialization time; only the tape arithmetic is left." },
  { id: "jsfuck", title: "JSFuck", src: jsfuck, entry: "jsfuck",
    args: { x: { dynamic: true, value: "5" } },
    blurb: "JavaScript written with only []()!+. Every coercion runs at specialization time." },
];

// Second projection. The interpreter is `interp(program, io)`: `program` is
// static, `io` is the host. `reads`: the io methods that return an input.
export const COMPILER = [
  { id: "prompt-print", title: "prompt / print", src: promptPrint, reads: ["prompt"],
    programs: [
      { title: "echo twice", program: '["prompt", "print", "prompt", "print"]', inputs: '["hello", "world"]' },
      { title: "print first", program: '["print", "prompt"]', inputs: '["late"]' },
      { title: "unknown instruction", program: '["prompt", "shout"]', inputs: '["hi"]' },
    ],
    blurb: "An interpreter for a two-instruction language. The derived compiler has one loop over the program and builds target code." },
  { id: "arithmetic", title: "Calculator", src: arithmetic, reads: ["fetch"],
    programs: [
      { title: "fetch × 3", program: '[["get"], ["scale", 3], ["send"]]', inputs: "[2.5]" },
      { title: "literal", program: '[["literal", 7], ["send"]]', inputs: "[]" },
      { title: "two reads", program: '[["get"], ["scale", -2], ["get"], ["send"]]', inputs: "[4, 9]" },
    ],
    blurb: "Instructions with operands. Static arithmetic on operands happens at compile time; arithmetic on fetched values is emitted." },
  { id: "helpers", title: "Helper functions", src: helpers, reads: ["prompt"],
    programs: [
      { title: "weights 2, 10", program: "[2, 10]", inputs: "[3, 4]" },
      { title: "no weights", program: "[]", inputs: "[]" },
    ],
    blurb: "The interpreter calls a helper function; specialization inlines it with its static argument." },
  { id: "guard", title: "Password check", src: guard, reads: ["prompt"],
    programs: [
      { title: "right password", program: '["swordfish"]', inputs: '["swordfish"]' },
      { title: "wrong password", program: '["swordfish"]', inputs: '["hunter2"]' },
    ],
    blurb: "A test on a dynamic value: the compiler emits a residual if. Its code still carries jsmix's environments for each branch." },
];

// Third projection. The interpreter's first function is the entry point: its
// first parameter is the program, the rest are runtime inputs.
export const COGEN = [
  { id: "opcodes", title: "Opcode interpreter", src: p3Int,
    programs: [
      { title: "(x + 1) * 3", program: '[["addin", 0], ["addlit", 1], ["mullit", 3]]' },
      { title: "x * 4 - x", program: '[["addin", 0], ["mullit", 4], ["subin", 0]]' },
      { title: "constant 42", program: '[["addlit", 6], ["mullit", 7]]' },
    ],
    x: "5",
    blurb: "A recursive opcode interpreter over an accumulator." },
  { id: "vm", title: "Bytecode VM", src: p3Vm,
    programs: [
      { title: "sum 1..n", program: '[["jz", 4], ["add"], ["dec"], ["jmp", 0], ["ret"]]' },
      { title: "n + n", program: '[["add"], ["add"], ["ret"]]' },
    ],
    x: "5",
    blurb: "A VM with a program counter and jumps; the compiler turns its loops into recursive functions." },
];
