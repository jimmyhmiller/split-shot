// Second Futamura projection sources, straight from docs/p2real.
import intSrc from "../../../docs/p2real/int.js?raw";
import jsmixSrc from "../../../docs/p2real/jsmix.js?raw";
import parseSrc from "../../../docs/p2real/parse.js?raw";

export { intSrc, jsmixSrc, parseSrc };

// parse.js is a CommonJS module (it sets module.exports when `module` exists).
const mod = { exports: {} };
Function("module", parseSrc)(mod);
export const parseProgram = mod.exports.parseProgram;

// The program handed to RustPE: jsmix with the parsed interpreter baked in as a
// static constant and the source program `prog` left dynamic.
export function projectionSource(intAst, entry) {
  return `${jsmixSrc}\nfunction main(prog) { var INT = ${JSON.stringify(intAst)}; return jsmix(INT, ${JSON.stringify(entry)}, prog); }\n`;
}

// Opcodes the interpreter dispatches on, for generating random programs.
export function opcodesOf(src) {
  const ops = new Set();
  for (const m of src.matchAll(/\[\s*0\s*\]\s*===\s*"([^"]+)"/g)) ops.add(m[1]);
  return [...ops];
}

export const PROGRAM_EXAMPLES = [
  { title: "(x + 1) * 3", prog: '[["addin", 0], ["addlit", 1], ["mullit", 3]]' },
  { title: "x * 4 - x", prog: '[["addin", 0], ["mullit", 4], ["subin", 0]]' },
  { title: "constant 42", prog: '[["addlit", 6], ["mullit", 7]]' },
  { title: "empty", prog: "[]" },
];
