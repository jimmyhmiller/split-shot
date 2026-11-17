const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const {createMachine} = require('./machine.cjs');
const raw = require('./generated/brainfuck.compiler.cjs');
const clean = require('./generated/brainfuck.bindings.cjs');
const reference = vm.runInNewContext(fs.readFileSync(path.join(__dirname,'interpreter.js'),'utf8')+'\ninterp');
const {parse} = require('../general-jsmix/derive.cjs');
const codegen = require('../general-jsmix/codegen.cjs');
const mix = Function('codegen',fs.readFileSync(path.join(__dirname,'../general-jsmix/jsmix.js'),'utf8')+'\nreturn jsmix;')(codegen);
const ast = parse(fs.readFileSync(path.join(__dirname,'interpreter.js'),'utf8'));
let comparisons = 0, rejected = 0;
function observe(fn, program, input, failAt = -1) {
  const machine = createMachine(input,failAt);
  try {return {result:fn(program,machine.io),...machine.snapshot()};}
  catch(error) {return {error:error.name+': '+error.message,...machine.snapshot()};}
}
function check(program,input,failures=false) {
  const expected = observe(reference,program,input);
  if(expected.error) {
    for(const compile of [raw.compile,clean.compile,p=>mix(ast,'interp',p)]) {
      assert.throws(()=>compile(program), error=>error.name+': '+error.message===expected.error);rejected++;
    }
    return;
  }
  assert.equal(raw.compile(program),clean.compile(program));
  assert.equal(raw.compile(program),mix(ast,'interp',program));
  for(const run of [raw.run,clean.run]) {assert.deepEqual(observe(run,program,input),expected,program);comparisons++;}
  if(failures)for(let i=0;i<expected.events.length;i++)for(const run of [raw.run,clean.run]) {
    assert.deepEqual(observe(run,program,input,i),observe(reference,program,input,i),program+' failure '+i);comparisons++;
  }
}
const ops=['+','-','>','<',',','.'];
for(let length=0;length<=3;length++)for(let bits=0;bits<6**length;bits++) {
  let x=bits;const program=Array.from({length},()=>{const op=ops[x%6];x=Math.floor(x/6);return op;}).join('');
  check(program,[0,255,64,67],true);
}
let seed=139;
function next(n){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;}
for(let trial=0;trial<250;trial++) {
  let pointer=0,program='';
  for(let i=0,length=next(65);i<length;i++) {
    const allowed=['+','-',',','.',' ', 'x'];if(pointer<15)allowed.push('>');if(pointer>0)allowed.push('<');
    const op=allowed[next(allowed.length)];program+=op;if(op==='>')pointer++;if(op==='<')pointer--;
  }
  check(program,[next(256),next(256),next(256)],false);
}
for(const [program,input] of [[',+>,-<.>.',[64,67]],[',+.',[255]],[',-.',[0]],[',.',[]],['>'.repeat(15)+'+.',[]],['noise\n,+.',[64]],['<',[]],['>'.repeat(16),[]],['[]',[]],['++[',[]]])check(program,input,true);
check('+'.repeat(100)+'.',[],false);
const example = observe(clean.run,',+>,-<.>.',[64,67]);
assert.deepEqual(example.output,[65,66]);
assert.equal(example.result,1);
const wrapUp=observe(clean.run,',+.',[255]);assert.deepEqual(wrapUp.output,[0]);
const wrapDown=observe(clean.run,',-.',[0]);assert.deepEqual(wrapDown.output,[255]);
const target=clean.compile(',+>,-<.>.');
assert.ok(!/\b(?:while|for|switch)\s*\(/.test(target));
assert.ok(!/\b(?:program|pointer|remaining)\b/.test(target));
assert.ok(target.includes('io.get(0)')&&target.includes('io.get(1)'));
const rawCompiler=fs.readFileSync(path.join(__dirname,'generated/brainfuck.output.txt'),'utf8');
assert.ok(!/evalExpr|envLookup|switch \(__pc\)/.test(rawCompiler));
fs.writeFileSync(path.join(__dirname,'generated/validation.json'),JSON.stringify({comparisons,rejected,example:{program:',+>,-<.>.',input:[64,67],output:example.output,finalPointer:example.result},targetHasDispatch:false,targetHasRuntimePointer:false},null,2)+'\n');
console.log(`${comparisons} BF interpreter/target comparisons and ${rejected} diagnostic checks passed`);
console.log('Example: @C -> AB; pointer movement specialized away; both cells fixed in target');
