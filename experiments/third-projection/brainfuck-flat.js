// Brainfuck with no loops: the tape, the pointer, input and output.
function bfflat(program, input) {
  var tape = [0, 0, 0, 0, 0, 0, 0, 0];
  var ptr = 0;
  var read = 0;
  var out = [];
  var pc = 0;
  while (pc < program.length) {
    var c = program[pc];
    if (c === "+") {
      tape = setAt(tape, ptr, (tape[ptr] + 1) % 256);
    } else if (c === "-") {
      tape = setAt(tape, ptr, (tape[ptr] + 255) % 256);
    } else if (c === ">") {
      ptr = ptr + 1;
    } else if (c === "<") {
      ptr = ptr - 1;
    } else if (c === ".") {
      out = out.concat([tape[ptr]]);
    } else if (c === ",") {
      tape = setAt(tape, ptr, input[read]);
      read = read + 1;
    }
    pc = pc + 1;
  }
  return out;
}
