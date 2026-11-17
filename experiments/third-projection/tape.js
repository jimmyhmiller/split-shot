// A tape and a pointer into it that moves at runtime: tape = setAt(tape, ptr, ...).
function tapeMachine(program, x) {
  var pc = 0;
  var ptr = 0;
  var tape = [0, 0, 0, 0];
  while (pc < program.length) {
    if (program[pc] === "+") {
      tape = setAt(tape, ptr, tape[ptr] + 1);
    } else {
      ptr = ptr + 1;
    }
    pc = pc + 1;
  }
  return tape;
}
