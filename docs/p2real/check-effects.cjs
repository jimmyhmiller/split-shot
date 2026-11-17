// Exercise the pending parser/evaluator additions and the derived compiler:
// ordered discarded calls, shared results, assignments, while, blocks, null.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const {parseProgram} = require('./parse.js');
const source = `function interp(prog, io) {
  var value = null;
  while (prog.length > 0) {
    if (prog[0] === 0) { value = io.prompt(); }
    else { io.print(value); }
    prog = prog.slice(1);
  }
  return value;
}`;
const funcs = parseProgram(source);
const mix = vm.runInNewContext(fs.readFileSync(path.join(__dirname,'jsmix.js'),'utf8')+'; jsmix');
const original = Function(source+'; return interp;')();
const dir = fs.mkdtempSync(path.join(os.tmpdir(),'p2-effects-'));
try {
  const input = path.join(dir,'interpreter.js'), output = path.join(dir,'compiler.cjs');
  fs.writeFileSync(input,source);
  execFileSync(process.execPath,[path.join(__dirname,'derive.js'),input,'-o',output],{timeout:120000,stdio:'pipe'});
  const compile = require(output).compile;
  function observe(run) {
    const trace = []; let n = 0;
    const io = {prompt() { assert.equal(this,io); trace.push(['prompt']); return ++n; }, print(x) { assert.equal(this,io); trace.push(['print',x]); }};
    return {result:run(io),trace};
  }
  let count=0;
  for (let length=0;length<=5;length++) for(let bits=0;bits<2**length;bits++) {
    const prog=Array.from({length},(_,i)=>(bits>>i)&1);
    const expected=observe(io=>original(prog,io));
    for(const text of [mix(funcs,'interp',prog),compile(prog)]) {
      assert.deepEqual(observe(Function('x','return '+text)),expected); count++;
    }
  }
  console.log(`P2 effects: ${count} interpreter/compiler trace comparisons passed`);
} finally { fs.rmSync(dir,{recursive:true,force:true}); }
