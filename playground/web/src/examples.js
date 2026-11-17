// The examples: plain programs from playground/examples, imported as text. An
// example is one or more files, specialized as one script in this order. Each
// has a `main`, the function split-shot specializes; its parameter is the
// dynamic input.
import power from "../../examples/power.js?raw";
import regex from "../../examples/regex.js?raw";
import poly from "../../examples/poly.js?raw";
import template from "../../examples/template.js?raw";
import format from "../../examples/format.js?raw";
import interp from "../../examples/interp.js?raw";
import vm from "../../examples/vm.js?raw";
import brainfuck from "../../examples/brainfuck.js?raw";
import jsfuck from "../../examples/jsfuck.js?raw";
import lambdaSpecializer from "../../examples/lambda/specializer.js?raw";
import lambdaCogen from "../../examples/lambda/cogen.js?raw";
import lambdaAllThree from "../../examples/lambda/all-three.js?raw";
// Interpreters from the interpreter suite (tools/wild/interp), each an ES
// module with a fixed program and an exported main.
import wasmInterpreter from "../../../experiments/wasm-binary/interpreter.mjs?raw";
import wasmBinary from "../../examples/wasm-binary.mjs?raw";
import interp1 from "../../../tools/wild/interp/forth-colon-defs.mjs?raw";
import interp2 from "../../../tools/wild/interp/cpu-6502-emulator.mjs?raw";
import interp3 from "../../../tools/wild/interp/register-vm-lua-style.mjs?raw";
import interp4 from "../../../tools/wild/interp/scheme-proto-env-tail-loop.mjs?raw";
import interp5 from "../../../tools/wild/interp/closure-threaded-sort.mjs?raw";
import interp6 from "../../../tools/wild/interp/assembler-two-pass.mjs?raw";
import interp7 from "../../../tools/wild/interp/turing-machine-table.mjs?raw";
import interp8 from "../../../tools/wild/interp/debruijn-lexical-tak.mjs?raw";
import interp9 from "../../../tools/wild/interp/peg-recognizer-assignments.mjs?raw";
// The second projection: each example's main, its interpreter, and jsmix with
// its parser and binding-time analysis (experiments/general-jsmix).
import mainBrainfuck from "../../examples/compiler-brainfuck.mjs?raw";
import mainExpressions from "../../examples/compiler-expressions.mjs?raw";
import mainPromptPrint from "../../examples/compiler-prompt-print.mjs?raw";
import intBrainfuck from "../../../experiments/general-jsmix/interpreters/brainfuck.js?raw";
import intExpressions from "../../../experiments/general-jsmix/interpreters/expressions.js?raw";
import intPromptPrint from "../../../experiments/readable-second-projection/interpreter.js?raw";
import jsmix from "../../../experiments/general-jsmix/jsmix.js?raw";
import bindingTimes from "../../../experiments/general-jsmix/binding-times.js?raw";
import subsetParse from "../../../experiments/general-jsmix/subset-parse.js?raw";

import cogenBrainfuck from "../../examples/cogen-brainfuck.mjs?raw";
import flowBrainfuck from "../../../experiments/third-projection/brainfuck.js?raw";
import flowchart from "../../../experiments/third-projection/flowchart.js?raw";
import flowMix from "../../../experiments/third-projection/mix.js?raw";
import flowGlue from "../../../experiments/third-projection/glue.js?raw";

const precomputedResult = (url) => {
  let saved;
  return () => saved ??= fetch(url).then(response => {
    if (!response.ok) throw new Error(`Could not load saved result (${response.status})`);
    return response.json();
  }).catch(error => { saved = null; throw error; });
};

const withFlowMix = (main) => [
  { name: "mix.js", src: flowMix },
  { name: "flowchart.js", src: flowchart },
  { name: "glue.js", src: flowGlue },
  { name: "subset-parse.js", src: subsetParse },
  { name: "main.mjs", src: main.replace(/^const INTERPRETER /m, () => flowBrainfuck.trimEnd() + "\n\nconst INTERPRETER ") },
];

const one = (src) => [{ name: "program.js", src }];
const module = (src) => [{ name: "program.mjs", src }];
// A compiler example's main.mjs holds its interpreter, just above the line
// that parses it: the interpreter's text (kept where its checks test it) goes
// in before `const INT`.
const withJsmix = (main, interpreter) => {
  if (!/^const INT /m.test(main)) throw new Error("a compiler example's main.mjs has no `const INT` line");
  return [
    { name: "main.mjs", src: main.replace(/^const INT /m, () => interpreter.trimEnd() + "\n\nconst INT ") },
    { name: "jsmix.js", src: jsmix },
    { name: "binding-times.js", src: bindingTimes },
    { name: "subset-parse.js", src: subsetParse },
  ];
};export const GROUPS = [
  { label: "Programs", examples: [
    { id: "power", title: "Power", files: one(power) },
    { id: "regex", title: "Regex matcher", files: one(regex) },
    { id: "poly", title: "Polynomial", files: one(poly) },
    { id: "template", title: "Template", files: one(template) },
    { id: "format", title: "printf", files: one(format) },
    { id: "interp", title: "Expression interpreter", files: one(interp) },
    { id: "vm", title: "Bytecode VM", files: one(vm) },
    { id: "brainfuck", title: "Brainfuck", files: one(brainfuck) },
    { id: "jsfuck", title: "JSFuck", files: one(jsfuck) },
  ] },
  { label: "Interpreters", examples: [
    { id: "wasm-structured-vm", title: "WebAssembly binary interpreter", files: [{ name: "main.mjs", src: wasmInterpreter + "\n" + wasmBinary }] },
    { id: "forth-colon-defs", title: "Forth", files: module(interp1) },
    { id: "cpu-6502-emulator", title: "6502 CPU emulator", files: module(interp2) },
    { id: "register-vm-lua-style", title: "Lua-style register VM", files: module(interp3) },
    { id: "scheme-proto-env-tail-loop", title: "Scheme", files: module(interp4) },
    { id: "closure-threaded-sort", title: "Direct-threaded code", files: module(interp5) },
    { id: "assembler-two-pass", title: "Assembler + register VM", files: module(interp6) },
    { id: "turing-machine-table", title: "Turing machine", files: module(interp7) },
    { id: "debruijn-lexical-tak", title: "Lexical addressing (tak)", files: module(interp8) },
    { id: "peg-recognizer-assignments", title: "PEG recognizer", files: module(interp9) },
  ] },
  { label: "Deriving a compiler", examples: [
    { id: "compiler-brainfuck", title: "Brainfuck compiler", files: withJsmix(mainBrainfuck, intBrainfuck) },
    { id: "compiler-expressions", title: "Expression compiler", files: withJsmix(mainExpressions, intExpressions) },
    { id: "compiler-prompt-print", title: "prompt / print compiler", files: withJsmix(mainPromptPrint, intPromptPrint) },
  ] },
  { label: "A compiler generator", examples: [
    { id: "cogen-brainfuck", title: "Brainfuck compiler from a cogen", files: withFlowMix(cogenBrainfuck), slow: true, precomputed: precomputedResult(new URL("./precomputed/cogen-brainfuck.json", import.meta.url).href) },
    { id: "all-three-projections", title: "All three projections", files: [{ name: "all-three.js", src: lambdaAllThree }, { name: "specializer.js", src: lambdaSpecializer }] },
    { id: "cogen-lambda", title: "The cogen itself", files: [{ name: "cogen.js", src: lambdaCogen }, { name: "specializer.js", src: lambdaSpecializer }] },
  ] },
];

export const EXAMPLES = GROUPS.flatMap((g) => g.examples);
