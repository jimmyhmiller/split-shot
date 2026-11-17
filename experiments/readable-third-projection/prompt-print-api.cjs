const M = require('../../demos/mogensen/engine.js');
const {compile: generatedCompile} = require('./generated/prompt-print.compile.cjs');
const {encode} = require('./prompt-print-program.cjs');
const {javascript} = require('./prompt-print-backend.cjs');
function compile(program) {
  return javascript(M.readback(generatedCompile(encode(program))));
}
module.exports = {compile};
