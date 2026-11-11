// inputs: ["A", "é", "Āz", "", "ÿ", "è", null, 7, "~"]
// forbid-main: \+ 1|switch|while|Uint8Array|jumps
// max-lines: 16
// A Brainfuck interpreter specialized on a program that adds 2 x 3 x 4 to a byte: the interpreter, its tape and its loops are gone, and the 24 increments of the byte, each reduced modulo 256 as the typed array stores it, are one addition. Integer arithmetic under a reduction modulo a power of two combines: `((b & 255) + 1 & 255) + 1 & 255` is `(b & 255) + 2 & 255`.
function main(input) {
  function brainfuck(code, input = "") {
    const tape = new Uint8Array(30000);
    const jumps = {}, stack = [];
    let pointer = 0, inputPointer = 0, output = "";
    for (let i = 0; i < code.length; i++) {
      if (code[i] === "[") stack.push(i);
      if (code[i] === "]") {
        const start = stack.pop();
        jumps[start] = i;
        jumps[i] = start;
      }
    }
    for (let i = 0; i < code.length; i++) {
      switch (code[i]) {
        case ">": pointer++; break;
        case "<": pointer--; break;
        case "+": tape[pointer]++; break;
        case "-": tape[pointer]--; break;
        case ".": output += String.fromCharCode(tape[pointer]); break;
        case ",":
          tape[pointer] = inputPointer < input.length
            ? input.charCodeAt(inputPointer++)
            : 0;
          break;
        case "[": if (!tape[pointer]) i = jumps[i]; break;
        case "]": if (tape[pointer]) i = jumps[i]; break;
      }
    }
    return output;
  }
  return brainfuck(",>++[>+++[>++++[<<<+>>>-]<-]<-]<.", input);
}
