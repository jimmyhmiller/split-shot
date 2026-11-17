// Straight-line Brainfuck: + - < > , . with 16 wrapping byte cells.
// Non-command text is ignored. Bracketed loops are explicitly unsupported.
function interp(program, machine) {
  var pointer = 0;
  while (program.length > 0) {
    var instruction = program[0];
    if (instruction === "+") {
      machine.set(pointer, (machine.get(pointer) + 1) & 255);
    } else if (instruction === "-") {
      machine.set(pointer, (machine.get(pointer) - 1) & 255);
    } else if (instruction === ">") {
      pointer = pointer + 1;
      if (pointer >= 16) { throw new RangeError("Tape pointer out of range"); }
    } else if (instruction === "<") {
      pointer = pointer - 1;
      if (pointer < 0) { throw new RangeError("Tape pointer out of range"); }
    } else if (instruction === ",") {
      machine.set(pointer, machine.read());
    } else if (instruction === ".") {
      machine.write(machine.get(pointer));
    } else if (instruction === "[") {
      throw new Error("Loops are not supported in this subset");
    } else if (instruction === "]") {
      throw new Error("Loops are not supported in this subset");
    }
    program = program.slice(1);
  }
  return pointer;
}
