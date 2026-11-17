const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
function load(name, residual) {
  const text = fs.readFileSync(path.join(__dirname, name + (residual ? '.output.txt' : '.js')), 'utf8');
  return vm.runInNewContext((residual ? text.slice(text.indexOf('\n') + 1) : text) + '\nmain');
}
let checks = 0;
for (const name of ['dynamic', 'fixed']) {
  const source = load(name, false), residual = load(name, true);
  for (const value of [-10, 0, 7, 1.5, 'hello']) {
    for (const opcode of [0, 1, 2, '0']) {
      const input = name === 'dynamic' ? [opcode, value] : value;
      assert.equal(residual(input), source(input));
      checks++;
    }
  }
}
console.log(`${checks} source/residual comparisons passed`);
