const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const M=require('../../demos/mogensen/engine.js');
const {interpreter,compiler,encode}=require('./prompt-print.cjs');
const readable=require('./generated/prompt-print.compile.cjs').compile;
const raw=M.runtime().run(compiler);
const {javascript}=require('./prompt-print-backend.cjs');
function interpret(program,io){
 let value=null;
 for(const op of program){
  if(op==='prompt')value=io.prompt();
  else if(op==='print')io.print(value);
  else throw new Error('Unknown instruction: '+op);
 }
 return value;
}
function observe(run,stop){
 const trace=[];let index=0;
 const values=['Ada','Grace',null,undefined,'',false,{name:'object'}];
 const io={
  get prompt(){trace.push('get prompt');return function(){assert.equal(this,io);trace.push(['prompt',arguments.length]);if(trace.length===stop)throw new Error('stopped');return values[index++%values.length];};},
  get print(){trace.push('get print');return function(value){assert.equal(this,io);trace.push(['print',value,arguments.length]);if(trace.length===stop)throw new Error('stopped');return 'ignored';};}
 };
 try{return {trace,result:run(io)};}catch(e){return {trace,error:e.message};}
}
const programs=[[]];
for(let length=1;length<=6;length++)for(let bits=0;bits<2**length;bits++)programs.push(Array.from({length},(_,i)=>bits&(1<<i)?'prompt':'print'));
programs.push(Array.from({length:80},(_,i)=>i%3?'print':'prompt'));
let structuralChecks=0,executionChecks=0;
for(const program of programs){
 const encoded=encode(program);
 const target=M.readback(raw(encoded)),clean=M.readback(readable(encoded));
 const p1=M.readback(M.makeMix().mix(M.quote(interpreter,true))(encoded));
 assert(M.same(target,clean));assert(M.same(target,p1));structuralChecks+=2;
 const js=require('./prompt-print-api.cjs').compile(program);
 assert.equal(js,javascript(clean));
 const run=Function('return ('+js+')')();
 for(const stop of [undefined,2,4,8]){
  const expected=observe(io=>interpret(program,io),stop);
  const actual=observe(run,stop);
  const lambda=observe(io=>M.runtime().run(target)(()=>io.prompt())(value=>io.print(value))(null),stop);
  assert.deepEqual(actual,expected,JSON.stringify(program));assert.deepEqual(lambda,expected);executionChecks+=2;
 }
}
for(const program of [['bogus'],['prompt','bogus']])assert.throws(()=>encode(program),/Unknown instruction: bogus/);
const example=['prompt','print','print','prompt','print'];
const output=javascript(M.readback(readable(encode(example))));
fs.writeFileSync(path.join(__dirname,'generated/prompt-print.example.js'),output+'\n');
const report={programs:programs.length,structuralChecks,executionChecks,unknownInstructionChecks:2,example};
fs.writeFileSync(path.join(__dirname,'generated/prompt-print.validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(output);console.log(report);
