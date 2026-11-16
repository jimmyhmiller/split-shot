const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const dir = __dirname;
function derive(interpreterPath, methods, outputPath, artifactPrefix) {
  if (!methods.every(name => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name))) {
    throw new Error('Host methods must be JavaScript identifiers');
  }
  const mix = fs.readFileSync(path.join(dir, 'effect-mix.js'), 'utf8');
  const interpreter = fs.readFileSync(interpreterPath, 'utf8');
  const input = mix + '\n' + interpreter + '\nfunction main(program) { return effectMix(interp, program, ' + JSON.stringify(methods) + '); }\n';
  fs.writeFileSync(artifactPrefix + '.input.js', input);
  const output = execFileSync(path.resolve(dir, '../../target/release/js-frontend'), ['--js', artifactPrefix + '.input.js'], {
    encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 30000
  });
  fs.writeFileSync(artifactPrefix + '.output.txt', output);
  const residual = output.slice(output.indexOf('\n') + 1).replace(/^function main\(/m, 'function compile(');
  const wrapper = '\nmodule.exports = { compile, run: function(program, io) { return Function("return (" + compile(program) + ");")()(io); } };\n';
  fs.writeFileSync(outputPath, residual + wrapper);
  return {output, residual, wrapper};
}
module.exports = { derive };
if (require.main === module) {
  const result = derive(path.join(dir, 'interpreter.js'), ['prompt', 'print'], path.join(dir, 'compiler.cjs'), path.join(dir, 'effects'));
  const {simplify} = require('../../tools/readable-js/index.cjs');
  const names = JSON.parse(fs.readFileSync(path.join(dir, 'readable-names.json'), 'utf8'));
  const readable = simplify(result.residual, {names});
  fs.writeFileSync(path.join(dir, 'compiler-readable.cjs'), readable.code + result.wrapper);
  fs.writeFileSync(path.join(dir, 'simplification.json'), JSON.stringify(readable.counts, null, 2) + '\n');
  console.log(result.output);
  console.log('Readability transforms:', readable.counts);
}
