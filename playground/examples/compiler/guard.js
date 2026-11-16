// The program is a password; the input is what the user types. The test
// compares a dynamic value, so the compiler emits a residual if/else.
function interp(program, io) {
  var answer = io.prompt();
  if (answer === program[0]) {
    io.print("welcome");
    return "accepted";
  }
  io.print("wrong password");
  return "rejected";
}
