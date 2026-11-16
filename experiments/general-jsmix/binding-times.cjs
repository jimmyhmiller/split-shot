// binding-times.js for Node. (That file holds only function declarations, so a
// program that includes it has no top-level code of its own; see derive.cjs.)
const fs = require('node:fs'), path = require('node:path');
module.exports = Function(fs.readFileSync(path.join(__dirname, 'binding-times.js'), 'utf8') + '\nreturn {analyze};')();
