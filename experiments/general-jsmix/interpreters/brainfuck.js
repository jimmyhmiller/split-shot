// Brainfuck. The program is source text; the host is the machine: io.load(a)
// and io.store(a, v) are the tape, io.read() and io.write(v) the bytes in
// and out. A loop's matching bracket is found in the text, and its body run
// while the current cell is not zero.
function interp(program, io) {
  return run(program, 0, program.length, 0, io);
}

// Run program[from..to) with the pointer at ptr; the pointer after.
function run(program, from, to, ptr, io) {
  var pc = from;
  while (pc < to) {
    var c = program[pc];
    if (c === "+") {
      var cell = io.load(ptr) + 1;
      io.store(ptr, cell);
    } else if (c === "-") {
      cell = io.load(ptr) - 1;
      io.store(ptr, cell);
    } else if (c === ">") {
      ptr = ptr + 1;
    } else if (c === "<") {
      ptr = ptr - 1;
    } else if (c === ".") {
      cell = io.load(ptr);
      io.write(cell);
    } else if (c === ",") {
      cell = io.read();
      io.store(ptr, cell);
    } else if (c === "[") {
      var close = matching(program, pc);
      while (io.load(ptr) !== 0) {
        ptr = run(program, pc + 1, close, ptr, io);
      }
      pc = close;
    }
    pc = pc + 1;
  }
  return ptr;
}

// The index of the "]" that closes the "[" at open.
function matching(program, open) {
  var depth = 1;
  var i = open + 1;
  while (depth > 0) {
    if (i >= program.length) {
      throw new Error("Unmatched [ at " + open);
    }
    if (program[i] === "[") {
      depth = depth + 1;
    }
    if (program[i] === "]") {
      depth = depth - 1;
    }
    i = i + 1;
  }
  return i - 1;
}
