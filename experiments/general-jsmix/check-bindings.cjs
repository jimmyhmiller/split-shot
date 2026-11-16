const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const original = require('./generated/prompt-print.readable.cjs');
const cleaned = require('./generated/prompt-print.bindings.cjs');
let checks = 0;
for (let length = 0; length <= 7; length++) {
  for (let bits = 0; bits < 2 ** length; bits++) {
    const program = Array.from({length}, (_, i) => (bits >> i) & 1 ? 'prompt' : 'print');
    assert.equal(cleaned.compile(program), original.compile(program));
    checks++;
  }
}
for (const prefix of [[], ['prompt'], ['print'], ['prompt', 'print']]) {
  for (const invalid of ['', 'other', null, 42]) {
    assert.throws(() => cleaned.compile([...prefix, invalid]), error => error.message === 'Unknown instruction: ' + invalid);
    checks++;
  }
}
const long = Array.from({length:500}, (_, i) => i % 2 ? 'print' : 'prompt');
assert.equal(cleaned.compile(long), original.compile(long)); checks++;
const ast = acorn.parse(fs.readFileSync(path.join(__dirname,'generated/prompt-print.bindings.cjs'),'utf8'), {ecmaVersion:2022});
const declarations=[];
function visit(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type==='VariableDeclaration') declarations.push(node);
  for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value==='object') visit(value);
}
visit(ast.body[0]);
assert.ok(declarations.every(d=>d.declarations.length===1));
assert.equal(declarations.filter(d=>d.kind==='const').length,9);
assert.deepEqual(declarations.filter(d=>d.kind==='let').map(d=>d.declarations[0].id.name),['remaining','value']);
console.log(`${checks} compiler equivalence/rejection checks passed; nine const bindings, only two loop-carried let bindings, no grouped declarations`);
