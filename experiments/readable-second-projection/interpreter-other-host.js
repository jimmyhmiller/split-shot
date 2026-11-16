// A second interpreter used to verify that effectMix has no instruction rules.
function interp(program, io) {
  var value = null;
  while (program.length > 0) {
    if (program[0] === "get") {
      value = io.fetch();
    } else if (program[0] === "repeat") {
      io.send(value, value);
    } else {
      io.send("literal text");
    }
    program = program.slice(1);
  }
  return value;
}
