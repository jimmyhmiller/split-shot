// Historical baseline: the small parser then did not support throw/new Error.
function interp(program, io) {
  var value = null;
  while (program.length > 0) {
    var instruction = program[0];
    if (instruction === "prompt") { value = io.prompt(); }
    else { io.print(value); }
    program = program.slice(1);
  }
  return value;
}
