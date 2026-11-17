const assert = require('node:assert/strict');
function createMachine(input = [], failAt = -1) {
  const bytes = Uint8Array.from(input);
  const tape = new Uint8Array(16);
  const output = [], events = [];
  let position = 0;
  function event(value) {
    events.push(value);
    if (events.length - 1 === failAt) throw new Error('Injected machine failure');
  }
  function address(index) {
    if (!Number.isInteger(index) || index < 0 || index >= tape.length) throw new RangeError('Tape pointer out of range');
  }
  const io = {
    get(index) { assert.equal(this, io); address(index); event(['get', index]); return tape[index]; },
    set(index, value) { assert.equal(this, io); address(index); event(['set', index, value]); tape[index] = value; },
    read() { assert.equal(this, io); event(['read']); return position < bytes.length ? bytes[position++] : 0; },
    write(value) { assert.equal(this, io); event(['write', value]); output.push(value); }
  };
  return {io, snapshot: () => ({tape: Array.from(tape), output: [...output], events: [...events], consumed: position})};
}
module.exports = {createMachine};
