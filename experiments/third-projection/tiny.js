// The smallest interpreter worth compiling: a program of "+" and "-"
// characters, each adding or taking one from an accumulator that starts at x.
function tiny(program, x) {
  var pc = 0;
  var acc = x;
  while (pc < program.length) {
    if (program[pc] === "+") {
      acc = acc + 1;
    } else {
      acc = acc - 1;
    }
    pc = pc + 1;
  }
  return acc;
}
