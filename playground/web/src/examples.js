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
// The second projection's specializer, from experiments/general-jsmix.
import jsmix from "../../../experiments/general-jsmix/jsmix.js?raw";
import bindingTimes from "../../../experiments/general-jsmix/binding-times.js?raw";
import subsetParse from "../../../experiments/general-jsmix/subset-parse.js?raw";

const one = (src) => [{ name: "program.js", src }];
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
  { label: "Deriving a compiler", examples: [
    { id: "compiler-prompt-print", title: "prompt / print", files: withJsmix(promptPrint) },
    { id: "compiler-calculator", title: "Calculator", files: withJsmix(calculator) },
    { id: "compiler-helpers", title: "Helper functions", files: withJsmix(helpers) },
    { id: "compiler-password", title: "Password check", files: withJsmix(password) },
  ] },
];

export const EXAMPLES = GROUPS.flatMap((g) => g.examples);
