const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const dir = __dirname;
const source = fs.readFileSync(path.join(dir, 'effect-mix-helpers.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(dir, 'interpreter.js'), 'utf8') +
  '\nfunction main(program) { return effectMix(interp, program, ["prompt", "print"]); }\n';
fs.writeFileSync(path.join(dir, 'helpers.input.js'), source);
const output = execFileSync(path.resolve(dir, '../../target/release/js-frontend'), ['--js', path.join(dir, 'helpers.input.js')], {encoding: 'utf8'});
fs.writeFileSync(path.join(dir, 'helpers.output.txt'), output);
const body = output.slice(output.indexOf('\n') + 1).replace(/^function main\(/m, 'function compile(');
const linkage = '\nconst codegen = require("./codegen-helpers.cjs");\nmodule.exports = {compile, run: function(program, io) { return Function("return (" + compile(program) + ");")()(io); }};\n';
fs.writeFileSync(path.join(dir, 'compiler-helpers.cjs'), body + linkage);
const {simplify} = require('../../tools/readable-js/index.cjs');
const readable = simplify(body, {names: {compile: {e: 'program', a: 'remaining', b: 'value', c: 'lines', d: 'instruction'}}});
fs.writeFileSync(path.join(dir, 'compiler-helpers-readable.cjs'), readable.code + linkage);
console.log(output);
console.log('With mechanical readability pass:\n' + readable.code);
