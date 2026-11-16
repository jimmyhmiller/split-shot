// Brainfuck. The program is source text; the input is a list of numbers.
// Returns the list of numbers the program writes.
function brainfuck(program, input) {
  var tape = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
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
    } else if (c === "[") {
      if (tape[ptr] === 0) {
        var depth = 1;
        while (depth > 0) {
          pc = pc + 1;
          if (program[pc] === "[") { depth = depth + 1; }
          if (program[pc] === "]") { depth = depth - 1; }
        }
      }
    } else if (c === "]") {
      if (tape[ptr] !== 0) {
        var back = 1;
        while (back > 0) {
          pc = pc - 1;
          if (program[pc] === "]") { back = back + 1; }
          if (program[pc] === "[") { back = back - 1; }
        }
      }
    }
    pc = pc + 1;
  }
  return out;
}
