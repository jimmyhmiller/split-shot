// A data encoding only: the generated compiler supplies all three handlers.
function encode(program) {
  let remaining = end => prompt => print => end(null);
  for (let i = program.length - 1; i >= 0; i--) {
    const tail = remaining;
    const instruction = program[i];
    if (instruction === 'prompt') {
      remaining = end => prompt => print => prompt(tail);
    } else if (instruction === 'print') {
      remaining = end => prompt => print => print(tail);
    } else {
      throw new Error('Unknown instruction: ' + instruction);
    }
  }
  return remaining;
}
module.exports = {encode};
