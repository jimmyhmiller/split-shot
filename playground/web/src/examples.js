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
import promptPrint from "../../examples/compiler-prompt-print.js?raw";
import calculator from "../../examples/compiler-calculator.js?raw";
import helpers from "../../examples/compiler-helpers.js?raw";
import password from "../../examples/compiler-password.js?raw";
import cogenLambda from "../../examples/cogen-lambda.js?raw";
// Interpreters from the interpreter suite (tools/wild/interp), each an ES
// module with a fixed program and an exported main.
import interp0 from "../../../tools/wild/interp/wasm-structured-vm.mjs?raw";
import interp1 from "../../../tools/wild/interp/forth-colon-defs.mjs?raw";
import interp2 from "../../../tools/wild/interp/cpu-6502-emulator.mjs?raw";
import interp3 from "../../../tools/wild/interp/register-vm-lua-style.mjs?raw";
import interp4 from "../../../tools/wild/interp/scheme-proto-env-tail-loop.mjs?raw";
import interp5 from "../../../tools/wild/interp/closure-threaded-sort.mjs?raw";
import interp6 from "../../../tools/wild/interp/assembler-two-pass.mjs?raw";
import interp7 from "../../../tools/wild/interp/turing-machine-table.mjs?raw";
import interp8 from "../../../tools/wild/interp/debruijn-lexical-tak.mjs?raw";
import interp9 from "../../../tools/wild/interp/peg-recognizer-assignments.mjs?raw";
// The second projection's specializer, from experiments/general-jsmix.
import jsmix from "../../../experiments/general-jsmix/jsmix.js?raw";
import bindingTimes from "../../../experiments/general-jsmix/binding-times.js?raw";
import subsetParse from "../../../experiments/general-jsmix/subset-parse.js?raw";

const one = (src) => [{ name: "program.js", src }];
const module = (src) => [{ name: "program.mjs", src }];
const withJsmix = (src) => [
  { name: "program.js", src },
  { name: "jsmix.js", src: jsmix },
  { name: "binding-times.js", src: bindingTimes },
  { name: "subset-parse.js", src: subsetParse },
];

export const GROUPS = [
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
    { id: "wasm-structured-vm", title: "WebAssembly VM", files: module(interp0) },
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
    { id: "compiler-prompt-print", title: "prompt / print", files: withJsmix(promptPrint) },
    { id: "compiler-calculator", title: "Calculator", files: withJsmix(calculator) },
    { id: "compiler-helpers", title: "Helper functions", files: withJsmix(helpers) },
    { id: "compiler-password", title: "Password check", files: withJsmix(password) },
  ] },
  { label: "A compiler generator", examples: [
    { id: "cogen-lambda", title: "Lambda calculus", files: one(cogenLambda) },
  ] },
];

export const EXAMPLES = GROUPS.flatMap((g) => g.examples);
