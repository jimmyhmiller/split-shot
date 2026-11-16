const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { parseProgram } = require('../../../../docs/p2real/parse.js');
const dir = __dirname;
const ast = parseProgram(fs.readFileSync(path.join(dir, 'interpreter-staged.js'), 'utf8'))[0];
// Resolve names to lexical addresses; this is generic frontend work, with no
// knowledge of instruction names or runtime methods.
function resolve(expr, scopes) {
  if (!Array.isArray(expr)) return expr;
  if (expr[0] === 'var' && expr.length === 2) {
    for (let depth = 0; depth < scopes.length; depth++) {
      const slot = scopes[depth].indexOf(expr[1]);
      if (slot >= 0) return ['var', [...Array(depth).fill(2), slot]];
    }
    throw new Error('Unbound name: ' + expr[1]);
  }
  if (expr[0] === 'fun') return ['fun', expr[1], resolve(expr[2], [expr[1], ...scopes])];
  return expr.map(item => resolve(item, scopes));
}
ast[3] = resolve(ast[3], [ast[2]]);
const mix = fs.readFileSync(path.join(dir, 'mix.js'), 'utf8');
const input = mix + '\nfunction main(program) { return mix(' + JSON.stringify(ast) + ', program); }\n';
fs.writeFileSync(path.join(dir, 'projection.input.js'), input);
const output = execFileSync(path.resolve(dir, '../../../../target/release/js-frontend'), ['--js', path.join(dir, 'projection.input.js')], {
  encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 30000
});
fs.writeFileSync(path.join(dir, 'projection.output.txt'), output);
const residual = output.slice(output.indexOf('\n') + 1).replace(/^function main\(/m, 'function compile(');
fs.writeFileSync(path.join(dir, 'compiler-staged.cjs'), residual + '\nmodule.exports = { compile };\n');
console.log(output);
