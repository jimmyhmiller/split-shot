// inputs: ["A", "é", "Āz", "", "ÿ", null, 7]
// forbid-main: switch|while|Uint8Array|jumps
// max-lines: 16
// The same interpreter on a program whose three nested loops run 10 x 10 x 10 times: its dispatch loop goes around some twelve thousand times while it is specialized, after one branch on the input (the read of a byte) whose arms rejoin. An activation is no more branched than it was once an `if` has rejoined with nothing changed but the slots it merges, so the loop runs on in its block; the thousand increments are one addition.
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
  return brainfuck(",>++++++++++[>++++++++++[>++++++++++[<<<+>>>-]<-]<-]<.", input);
}
