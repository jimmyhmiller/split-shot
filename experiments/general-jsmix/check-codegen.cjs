const assert = require('node:assert/strict');
const codegen = require('./codegen.cjs');
const methods = ['prompt', 'default', '$method', 'π', 'with-dash', 'with space', 'quote"key', '0', ''];
for (const method of methods) {
  const lines = codegen.buffer();
  const result = codegen.call(lines, codegen.reference('io'), method, [7]);
  const source = codegen.finish(lines, result);
  const io = {[method](value) { assert.equal(this, io); return value; }};
  assert.equal(Function('return (' + source + ');')()(io), 7);
  const usesDot = ['prompt', 'default', '$method', 'π'].includes(method);
  assert.ok(source.includes(usesDot ? 'io.' + method + '(' : 'io[' + JSON.stringify(method) + ']('), source);
}
const property = codegen.property(codegen.reference('io'), 'prompt');
assert.equal(property.source, 'io.prompt');
const computed = codegen.property(codegen.reference('io'), codegen.reference('key'));
assert.equal(computed.source, 'io[key]');
assert.equal(Function('io', 'key', 'return ' + computed.source)({'with-dash': 9}, 'with-dash'), 9);
// Keep precedence for compound receivers and numeric literals.
const lines = codegen.buffer();
const result = codegen.call(lines, codegen.reference('choose ? left : right'), 'read', []);
let calls = 0;
const io = {read() { assert.equal(this, io); calls++; return 5; }};
assert.equal(Function('left','right','choose', lines.join('')+'return '+result.source)(io, {}, true), 5);
assert.equal(calls, 1);
const numericLines = codegen.buffer();
const numeric = codegen.call(numericLines, 7, 'toString', []);
assert.equal(Function(numericLines.join('')+'return '+numeric.source)(), '7');
// Prepared calls must retain getter order and receiver binding, too.
const preparedLines = codegen.buffer();
const prepared = codegen.prepare(preparedLines, codegen.reference('io'), 'read');
const invoked = codegen.invoke(preparedLines, prepared, []);
assert.ok(preparedLines.join('').includes('.read;'));
assert.equal(Function('io',preparedLines.join('')+'return '+invoked.source)(io), 5);
console.log('Dot/bracket codegen checks passed for identifier, reserved, Unicode and unusual keys, computed keys, receiver precedence and this binding');
