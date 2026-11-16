const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { compile, run } = require('./compiler.cjs');
const source = fs.readFileSync(__dirname + '/interpreter.js', 'utf8');
const interp = vm.runInNewContext(source + '\ninterp');
const effectMix = vm.runInNewContext(fs.readFileSync(__dirname + '/effect-mix.js', 'utf8') + '\neffectMix');
function observe(fn, program, failAt = -1) {
  const events = [];
  let reads = 0;
  function event(value) {
    events.push(value);
    if (events.length - 1 === failAt) throw new Error('I/O failed');
  }
  const io = {
    prompt() {
      assert.equal(this, io);
      event(['prompt']);
      return ['hello', '', 'héllo 🌍'][reads++ % 3];
    },
    print(value) {
      assert.equal(this, io);
      event(['print', value]);
    }
  };
  try { return { result: fn(program, io), events }; }
  catch (error) { return { error: error.message, events }; }
}
const readable = require("./compiler-readable.cjs");
const helpers = require("./compiler-helpers.cjs");
const helpersReadable = require("./compiler-helpers-readable.cjs");
const alternatives = [helpers, helpersReadable, readable,require("./compiler-reduce.cjs"), require("./compiler-recursive.cjs")];
let checks = 0;
for (let length = 0; length <= 7; length++) {
  for (let bits = 0; bits < 2 ** length; bits++) {
    const program = Array.from({length}, (_, i) => (bits >> i) & 1 ? 'prompt' : 'print');
    assert.equal(compile(program), effectMix(interp, program, ['prompt', 'print']));
    assert.equal(readable.compile(program), compile(program));
    assert.equal(helpers.compile(program), compile(program));
    assert.equal(helpersReadable.compile(program), compile(program));
    const expected = observe(interp, program);
    assert.deepEqual(observe(run, program), expected);
    for (const alternative of alternatives) { assert.deepEqual(observe(alternative.run, program), expected); }
    assert.equal(expected.events.length, program.length);
    for (let failAt = 0; failAt < length; failAt++) {
      assert.deepEqual(observe(run, program, failAt), observe(interp, program, failAt));
      for (const alternative of alternatives) { assert.deepEqual(observe(alternative.run, program, failAt), observe(interp, program, failAt)); }
    }
    checks++;
  }
}
let invalidChecks = 0;
for (const prefix of [[], ['print'], ['prompt'], ['prompt', 'print']]) {
  for (const instruction of ['unknown', '', 'PRINT', null, 42]) {
    const program = [...prefix, instruction, 'prompt', 'print'];
    const message = 'Unknown instruction: ' + instruction;
    const interpreted = observe(interp, program);
    assert.equal(interpreted.error, message);
    assert.equal(interpreted.events.length, prefix.length);
    for (const compiler of [compile, readable.compile, helpers.compile, helpersReadable.compile,
      p => effectMix(interp, p, ['prompt', 'print'])]) {
      assert.throws(() => compiler(program), error => error.name === 'Error' && error.message === message);
      invalidChecks++;
    }
  }
}
console.log(`${invalidChecks} unknown-instruction rejection checks passed`);
const long = Array.from({length: 500}, (_, i) => i % 2 ? 'print' : 'prompt');
assert.deepEqual(observe(run, long), observe(interp, long));
for (const alternative of alternatives) { assert.deepEqual(observe(alternative.run, long), observe(interp, long)); }
assert.deepEqual(observe(run, ['prompt', 'print', 'print']).events,
  [['prompt'], ['print', 'hello'], ['print', 'hello']]);
const child = spawnSync(process.execPath, [__dirname + '/run.cjs', '["prompt","print","prompt","print"]'], {
  input: 'hello\nhéllo 🌍\n', encoding: 'utf8'
});
assert.equal(child.status, 0, child.stderr);
assert.ok(child.stdout.endsWith('Enter text: hello\nEnter text: héllo 🌍\n'), child.stdout);
console.log(`${checks} exhaustive short-program comparisons, all I/O failure positions, a 500-instruction program, repeated-print and Unicode terminal checks passed`);
assert.ok(!fs.readFileSync(__dirname + '/compiler.cjs', 'utf8').includes('=== \"lit\"'));
console.log('Example generated program:\n' + compile(['prompt', 'print', 'prompt', 'print']));
