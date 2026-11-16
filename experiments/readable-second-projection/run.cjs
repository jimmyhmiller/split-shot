const fs = require('node:fs');
const { compile } = require('./compiler.cjs');
const program = JSON.parse(process.argv[2] || '["prompt","print"]');
if (!Array.isArray(program) || !program.every(op => op === 'prompt' || op === 'print')) {
  throw new Error('Expected an array containing only "prompt" and "print"');
}
const source = compile(program);
console.log('Generated program:\n' + source);
const io = {
  prompt() {
    process.stdout.write('Enter text: ');
    const bytes = [], byte = Buffer.alloc(1);
    let received = false;
    while (fs.readSync(0, byte, 0, 1, null) !== 0) {
      received = true;
      if (byte[0] === 10) break;
      bytes.push(byte[0]);
    }
    if (!received) throw new Error('End of input');
    return Buffer.from(bytes).toString('utf8').replace(/\r$/, '');
  },
  print(value) { console.log(value); }
};
Function('return (' + source + ');')()(io);
