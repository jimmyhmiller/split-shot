const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const { derive } = require('./derive-effects.cjs');
const dir = __dirname;
const output = derive(path.join(dir, 'interpreter-other-host.js'), ['fetch', 'send'], path.join(dir, 'compiler-other-host.cjs'), path.join(dir, 'other-host'));
const reference = vm.runInNewContext(fs.readFileSync(path.join(dir, 'interpreter-other-host.js'), 'utf8') + '\ninterp');
const { run, compile } = require('./compiler-other-host.cjs');
function observe(fn, program) {
  const events = [];
  let n = 0;
  const io = {
    fetch() { assert.equal(this, io); events.push(['fetch']); return ['hello', '世界'][n++ % 2]; },
    send(...values) { assert.equal(this, io); events.push(['send', ...values]); }
  };
  return {result: fn(program, io), events};
}
let count = 0;
for (let length = 0; length <= 5; length++) {
  for (let digits = 0; digits < 3 ** length; digits++) {
    let d = digits;
    const program = Array.from({length}, () => {const op = ['get', 'repeat', 'literal'][d % 3]; d = Math.floor(d / 3); return op;});
    assert.deepEqual(observe(run, program), observe(reference, program));
    count++;
  }
}
assert.deepEqual(observe(run, ['get', 'repeat', 'literal']).events,
  [['fetch'], ['send', 'hello', 'hello'], ['send', 'literal text']]);
const specializer = fs.readFileSync(path.join(dir, 'effect-mix.js'), 'utf8');
for (const name of ['prompt', 'print', 'fetch', 'send', 'repeat', 'literal text']) assert.ok(!specializer.includes('"' + name + '"'));
console.log(`${count} second-interpreter checks passed; zero-, one-, two-argument calls and static string literals verified`);
console.log(output.output.split('\n')[0]);
console.log(compile(['get', 'repeat', 'literal']));
