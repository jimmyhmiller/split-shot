// The examples: plain programs from playground/examples, imported as text.
// Each ends with `main`, the function split-shot specializes; its parameter
// is the dynamic input.
import power from "../../examples/power.js?raw";
import regex from "../../examples/regex.js?raw";
import poly from "../../examples/poly.js?raw";
import template from "../../examples/template.js?raw";
import format from "../../examples/format.js?raw";
import interp from "../../examples/interp.js?raw";
import vm from "../../examples/vm.js?raw";
import brainfuck from "../../examples/brainfuck.js?raw";
import jsfuck from "../../examples/jsfuck.js?raw";

export const EXAMPLES = [
  { id: "power", title: "Power", src: power },
  { id: "regex", title: "Regex matcher", src: regex },
  { id: "poly", title: "Polynomial", src: poly },
  { id: "template", title: "Template", src: template },
  { id: "format", title: "printf", src: format },
  { id: "interp", title: "Expression interpreter", src: interp },
  { id: "vm", title: "Bytecode VM", src: vm },
  { id: "brainfuck", title: "Brainfuck", src: brainfuck },
  { id: "jsfuck", title: "JSFuck", src: jsfuck },
];
