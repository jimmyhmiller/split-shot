// style: Brainfuck (source string indexed a character at a time, brackets matched by scanning at runtime, Uint8Array tape)
// residue: "[-+<>.,\[\]]{4,}"
const SRC = "++++++++[>++++++++<-]>+.>,[>,]<[.<]";
function bf(src, inputStr) {
  const tape = new Uint8Array(300);
  let ptr = 0, ip = 0, inp = 0, out = "";
  while (ip < src.length) {
    const c = src[ip];
    if (c === ">") ptr++;
    else if (c === "<") ptr--;
    else if (c === "+") tape[ptr]++;
    else if (c === "-") tape[ptr]--;
    else if (c === ".") out += String.fromCharCode(tape[ptr]);
    else if (c === ",") tape[ptr] = inp < inputStr.length ? inputStr.charCodeAt(inp++) : 0;
    else if (c === "[" && tape[ptr] === 0) { let d = 1; while (d) { ip++; if (src[ip] === "[") d++; else if (src[ip] === "]") d--; } }
    else if (c === "]" && tape[ptr] !== 0) { let d = 1; while (d) { ip--; if (src[ip] === "]") d++; else if (src[ip] === "[") d--; } }
    ip++;
  }
  return out;
}
export function main(input) { return bf(SRC, input.s); }
export const inputs = [{ s: "" }, { s: "a" }, { s: "hello" }, { s: "partial evaluation" }, { s: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }, { s: "The quick brown fox jumps over the lazy dog" }];
