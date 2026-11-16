// Optional, separate pass: do not change the raw or first readability output.
const fs = require('node:fs');
const path = require('node:path');
const {cleanBindings} = require('../../tools/readable-js/bindings.cjs');
const prefix = path.join(__dirname, 'generated/prompt-print');
const result = cleanBindings(fs.readFileSync(prefix + '.readable.cjs', 'utf8'));
fs.writeFileSync(prefix + '.bindings.cjs', result.code);
fs.writeFileSync(prefix + '.bindings.json', JSON.stringify(result.counts, null, 2) + '\n');
console.log(result.code);
console.log(result.counts);
