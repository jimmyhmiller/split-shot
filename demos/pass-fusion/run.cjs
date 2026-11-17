const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync, spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const out = path.join(__dirname, 'generated');
const files = ['framework.js', 'passes/constant-fold.js', 'passes/strength-reduce.js', 'passes/remove-identities.js', 'pipeline.js'];
const source = files.map(f => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n');
execFileSync('cargo', ['build', '-q', '--release', '-p', 'js-frontend', '--bin', 'js-frontend'], {cwd: root, stdio: 'inherit'});
const input = path.join(out, 'pipeline.input.js');
fs.writeFileSync(input, source);
const result = spawnSync(path.join(root, 'target/release/js-frontend'), ['--js', '--budget', '2M', input], {
  encoding: 'utf8', timeout: 60000, maxBuffer: 32 * 1024 * 1024,
  env: {...process.env, PE_NO_SHARED_CONTEXTS: '1', PE_CONTEXT_POINTS: '1'}
});
fs.writeFileSync(path.join(out, 'pipeline.stderr.txt'), result.stderr || '');
if (result.status !== 0) throw Error(result.error?.message || result.stderr);
const residual = result.stdout.replace(/^---[^\n]*\n/, '');
fs.writeFileSync(path.join(out, 'pipeline.residual.js'), residual);
new vm.Script(residual);
console.log(residual);

const assert = require('node:assert/strict');
const acorn = require('acorn');
const {print} = require('./print.cjs');
const load = (text, expression) => vm.runInThisContext(`(()=>{${text}\nreturn ${expression};})()`);
const generic = load(source, 'main');
const specialized = load(residual, 'main');
const passObjects = '[{exit:constantFold},{exit:strengthReduce},{exit:removeIdentities}]';
const staged = load(source, `ast => {
  for (const pass of ${passObjects}) ast = transform(ast, [pass]);
  return ast;
}`);
// Keep the AST contract explicit: only pure numeric expressions, no getters,
// calls, mutation, member access, BigInt, overloaded operators, or strings.
function numericAst(node) {
  if (node.type === 'Literal' && typeof node.value === 'number') return {type: node.type, value: node.value};
  if (node.type === 'Identifier' && ['x', 'y', 'enabled'].includes(node.name)) return {type: node.type, name: node.name};
  if (node.type === 'UnaryExpression' && ['+', '-'].includes(node.operator)) {
    return {type: node.type, operator: node.operator, prefix: true, argument: numericAst(node.argument)};
  }
  if (node.type === 'BinaryExpression' && ['+', '-', '*', '/', '**'].includes(node.operator)) {
    return {type: node.type, operator: node.operator, left: numericAst(node.left), right: numericAst(node.right)};
  }
  if (node.type === 'ConditionalExpression') {
    return {type: node.type, test: numericAst(node.test), consequent: numericAst(node.consequent), alternate: numericAst(node.alternate)};
  }
  throw Error('Outside the numeric AST language: ' + node.type);
}
const exampleSource = fs.readFileSync(path.join(__dirname, 'example.js'), 'utf8');
const parsed = acorn.parse(exampleSource, {ecmaVersion: 2022});
const expression = numericAst(parsed.body[0].body.body[0].argument);
const optimized = specialized(expression);
parsed.body[0].body.body[0].argument = optimized;
const emitted = print(parsed);
fs.writeFileSync(path.join(out, 'example.optimized.js'), emitted);
console.log('\nCompiled example:\n' + emitted);
const literal = value => ({type: 'Literal', value});
const identifier = name => ({type: 'Identifier', name});
const binary = (operator, left, right) => ({type:'BinaryExpression', operator, left, right});
const unary = (operator, argument) => ({type:'UnaryExpression', operator, prefix:true, argument});
const conditional = (test, consequent, alternate) => ({type:'ConditionalExpression', test, consequent, alternate});
const numbers = [0, -0, 1, -1, 2, -2, 0.5, -0.5, Number.MIN_VALUE, Number.MAX_VALUE, Infinity, -Infinity, NaN];
let state = 0x913b43;
const random = n => {state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return (state >>> 8) % n;};
function randomAst(depth) {
  if (!depth || random(4) === 0) return random(2) ? literal(numbers[random(numbers.length)]) : identifier(['x','y','enabled'][random(3)]);
  const kind = random(3);
  if (kind === 0) return unary(['+','-'][random(2)], randomAst(depth-1));
  if (kind === 1) return conditional(randomAst(depth-1), randomAst(depth-1), randomAst(depth-1));
  return binary(['+','-','*','/','**'][random(5)], randomAst(depth-1), randomAst(depth-1));
}
function evaluate(node, env) {
  switch (node.type) {
    case 'Literal': return node.value;
    case 'Identifier': return env[node.name];
    case 'UnaryExpression': return node.operator === '+' ? +evaluate(node.argument, env) : -evaluate(node.argument, env);
    case 'ConditionalExpression': return evaluate(node.test, env) ? evaluate(node.consequent, env) : evaluate(node.alternate, env);
    case 'BinaryExpression': {
      const a = evaluate(node.left, env), b = evaluate(node.right, env);
      switch (node.operator) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return a / b;
        case '**': return a ** b;
      }
    }
  }
  throw Error('Unexpected AST');
}
const fixtures = [expression];
for (const n of numbers) {
  fixtures.push(unary('+',literal(n)), binary('*',identifier('x'),literal(n)), binary('**',identifier('x'),literal(n)));
  fixtures.push(binary('+', binary('*', identifier('x'), literal(1)), literal(n)));
}
for (let i=0; i<1000; i++) fixtures.push(randomAst(5));
const environments = numbers.map((x, i) => ({x, y:numbers[(i+3)%numbers.length], enabled:i%2}));
let semanticChecks = 0;
let generatedJsChecks = 0;
for (const ast of [...fixtures, ...fixtures.slice().reverse()]) {
  const snapshot = structuredClone(ast);
  const expected = staged(ast);
  assert.deepEqual(generic(ast), expected, 'streaming versus staged');
  const actual = specialized(ast);
  assert.deepEqual(actual, expected, 'residual versus staged');
  assert.deepEqual(ast, snapshot, 'input mutated');
  const printedFunction = new Function('x', 'y', 'enabled', 'return ' + print(actual));
  for (const env of environments) {
    assert.ok(Object.is(evaluate(ast, env), evaluate(actual, env)), 'numeric semantics differ');
    assert.ok(Object.is(evaluate(ast, env), printedFunction(env.x, env.y, env.enabled)), 'printed JS differs');
    semanticChecks++;
    generatedJsChecks++;
  }
}
// Verify generated JavaScript as well as transformed AST semantics.
const originalFunction = load(exampleSource, 'score');
const compiledFunction = load(emitted, 'score');
for (const {x,y,enabled} of environments) assert.ok(Object.is(originalFunction(x,y,enabled), compiledFunction(x,y,enabled)));
// The iterative traversal must also handle trees too deep for recursion.
let deep = identifier('x');
for (let i=0; i<20000; i++) deep = unary('+',deep);
assert.deepEqual(specialized(deep), identifier('x'));
assert.equal((residual.match(/\b(?:while|for)\s*\(/g) || []).length, 1);
assert.equal((residual.match(/\bfunction\b/g) || []).length, 1);
assert.ok(!/\.exit\b|constantFold|strengthReduce|removeIdentities|constant-fold/.test(residual));
const report = {astChecks:fixtures.length*2, semanticChecks, generatedJsChecks:generatedJsChecks+environments.length, deepAstNodes:20001, residualFunctions:1, traversalLoops:1, node:process.version};
fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report,null,2)+'\n');
console.log(report);
