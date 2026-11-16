const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {derive,parse}=require('./derive.cjs'),codegen=require('./codegen.cjs');
const mix=Function('codegen',fs.readFileSync(path.join(__dirname,'jsmix.js'),'utf8')+'\nreturn jsmix;')(codegen);
let comparisons=0;
function interpret(source){return vm.runInNewContext(source+'\ninterp');}
function observe(fn,program,inputs,failAt=-1){
 const events=[];let pos=0,last;
 function record(e){events.push(e);if(events.length-1===failAt)throw new Error('I/O failed');}
 const io={
  prompt(){assert.equal(this,io);record(['prompt']);return inputs[pos++%inputs.length];},
  print(value){assert.equal(this,io);last=value;record(['print',value]);},
  fetch(){assert.equal(this,io);record(['fetch']);return inputs[pos++%inputs.length];},
  send(...values){assert.equal(this,io);record(['send',...values]);}
 };
 try{const result=fn(program,io);return structuredClone({result,events,sameObject:result!==null&&typeof result==='object'?result===last:null});}
 catch(e){return structuredClone({error:e.name+': '+e.message,events});}
}
function checkCase(name,source,programs,inputs,failures=false){
 const {ast,prefix,residual}=derive(source,name),compiler=require(prefix+'.compiler.cjs'),reference=interpret(source);
 for(const p of programs){
  assert.equal(compiler.compile(p),mix(ast,'interp',p),name+' P2/P1 source');
  if(name==='prompt-print'){const readable=require(prefix+'.readable.cjs');assert.equal(readable.compile(p),compiler.compile(p));assert.deepEqual(observe(readable.run,p,inputs),observe(reference,p,inputs));}
  const expected=observe(reference,p,inputs);
  assert.deepEqual(observe(compiler.run,p,inputs),expected,name+' '+JSON.stringify(p));comparisons++;
  if(failures)for(let i=0;i<expected.events.length;i++){
   assert.deepEqual(observe(compiler.run,p,inputs,i),observe(reference,p,inputs,i),name+' failure '+i);comparisons++;
  }
 }
 return {compiler,residual};
}
const source=fs.readFileSync(path.join(__dirname,'../readable-second-projection/interpreter.js'),'utf8');
const programs=[];
for(let len=0;len<=7;len++)for(let bits=0;bits<2**len;bits++)programs.push(Array.from({length:len},(_,i)=>(bits>>i)&1?'prompt':'print'));
const primary=checkCase('prompt-print',source,programs,['hello','','世界 🌍'],true);
const long=Array.from({length:500},(_,i)=>i%2?'print':'prompt');
assert.deepEqual(observe(primary.compiler.run,long,['long']),observe(interpret(source),long,['long']));comparisons++;
for(const prefix of [[],['prompt'],['print'],['prompt','print']])for(const bad of ['unknown','',null,42]){
 const p=[...prefix,bad,'print'];
 assert.throws(()=>primary.compiler.compile(p),e=>e.name==='Error'&&e.message==='Unknown instruction: '+bad);comparisons++;
}
assert.ok(!/function __rf|switch \(__pc\)|envLookup|evalExpr|\["(?:lit|var|while|fundecl)"/.test(primary.residual),primary.residual);
checkCase('arithmetic',`function interp(p,io){var value=0;while(p.length>0){if(p[0][0]==="get"){value=io.fetch();}else if(p[0][0]==="scale"){value=value*p[0][1];}else if(p[0][0]==="literal"){value=p[0][1];}else{io.send(value);}p=p.slice(1);}return value;}`,
 [[],[['get'],['scale',3],['send']], [['literal','text'],['send']], [['get'],['scale',-2],['get'],['send']]], [2.5,-4],true);
for(const input of ['yes','no']){
 checkCase('dynamic-if-'+input,`function interp(p,io){var value=io.prompt();if(value===p[0]){io.print("yes");value="accepted";}else{io.print("no");value="rejected";}return value;}`,[['yes']], [input],true);
 checkCase('early-return-'+input,`function interp(p,io){var value=io.prompt();if(value===p[0]){return "early";}io.print(value);return value;}`,[['yes']], [input],true);
 checkCase('dynamic-throw-'+input,`function interp(p,io){var value=io.prompt();if(value===p[0]){throw new Error("stopped");}io.print(value);return value;}`,[['yes']], [input],true);
 checkCase('conditional-'+input,`function interp(p,io){return io.prompt()===p[0]?io.prompt():io.prompt();}`,[['yes']], [input,'left','right'],true);
}
checkCase('array-alias',`function interp(p,io){var value=[io.prompt(),io.prompt()];io.print(value);return value;}`,[[]],['a','b'],true);
checkCase('hoisting',`function interp(p,io){io.print(value);var value=io.prompt();return value;}`,[[]],['hello'],true);
checkCase('named-function',`function scale(amount,value){return value*amount;} function interp(p,io){var value=scale(p[0],io.prompt());io.print(value);return value;}`,[[-2],[0],[3]], [2.5],true);
checkCase('string-escaping',`function interp(p,io){io.print("quote: \\\" and newline: \\n");return p[0];}`,[['done']],[],true);
console.log(`${comparisons} interpreter/compiled-target comparisons passed (including failure positions)`);
// Observable JavaScript evaluation order and sharing, independent of normal I/O.
function customCheck(name,source,makeInput,program=[]){
 const {prefix,ast}=derive(source,name),compiler=require(prefix+'.compiler.cjs'),reference=interpret(source);
 function observed(fn){
  const events=[];const input=makeInput(events);
  try{return {value:structuredClone(fn(program,input)),events:structuredClone(events)};}catch(e){return {error:e.name+': '+e.message,events:structuredClone(events)};}
 }
 assert.equal(compiler.compile(program),mix(ast,'interp',program));
 assert.deepEqual(observed(compiler.run),observed(reference),name);comparisons++;
}
customCheck('method-order','function interp(p,io){return io.print(io.prompt());}', events=>{
 const io={};Object.defineProperties(io,{
  print:{get(){events.push('get print');return function(x){assert.equal(this,io);events.push(['print',x]);return x;};}},
  prompt:{get(){events.push('get prompt');return function(){assert.equal(this,io);events.push('prompt');return 'hello';};}}
 });return io;
});
customCheck('argument-order','function interp(p,io){return io.send(io.value,io.prompt());}',events=>({
 get value(){events.push('get value');return 'first';},
 prompt(){events.push('prompt');return 'second';},
 send(...args){events.push(['send',...args]);return args;}
}));
customCheck('coercion-once','function interp(p,io){var value=io.prompt()+1;io.print(value);return value+value;}',events=>({
 prompt(){events.push('prompt');return {valueOf(){events.push('coerce');return 2;}};},print(v){events.push(['print',v]);}
}));
customCheck('binary-order','function interp(p,io){return io.value+io.prompt();}',events=>({
 get value(){events.push('get value');return 2;},prompt(){events.push('prompt');return 3;}
}));
checkCase('static-return-lift',`function choose(p,x){if(p===0){return 7;}return x+1;}function interp(p,io){return choose(p[0],io.prompt());}`,[[0],[1]],[2]);
const numeric=derive('function interp(p,io){return io+p[0];}','numeric').prefix;
const numericRun=require(numeric+'.compiler.cjs').run;
for(const p of [0,-0,NaN,Infinity,-Infinity])for(const x of [0,-0,2,NaN]){assert.equal(numericRun([p],x),x+p);comparisons++;}
console.log(`${comparisons} total comparisons, including getter order, argument order, coercion sharing and special numbers`);
for(const input of ['yes','no']){
 checkCase('deferred-static-error-'+input,`function interp(p,io){if(io.prompt()===p[0]){return null.value;}return "safe";}`,[['yes']],[input],true);
}
checkCase('undefined-shadow',`function echo(undefined){return undefined;}function interp(p,io){var value=io.prompt();var value;io.print(value);return echo(value);}`,[[]],['kept'],true);
checkCase('unary',`function interp(p,io){return -io.prompt();}`,[[]],[2.5],true);
assert.throws(()=>parse('function interp(p,io){while(io.prompt()){io.print(p);}return p;}'),/Dynamic while/);
assert.throws(()=>parse('function interp(p,Error){throw new Error("x");}'),/Shadowed builtin/);


checkCase('static-string-method',`function interp(p,io){var value="hello".toUpperCase();io.print(value);return value;}`,[[]],[],true);
checkCase('slice-arity',`function interp(p,io){return p.slice().slice(1,3)[0];}`,[[0,"first","second","third"]],[]);

checkCase('static-conditional-lift',`function interp(p,io){var value=p[0]?1:io.prompt();io.print(value);return value;}`,[[true],[false]],['input'],true);
checkCase('missing-argument-lift',`function identity(x){return x;}function interp(p,io){io.print(identity(io.prompt()));io.print(identity());return identity(p[0]);}`,[[-0],[NaN],[Infinity]],['input'],true);
const noMessageSource='function interp(p,io){if(io.prompt()===p[0]){throw new Error();}return "ok";}';
const noMessage=derive(noMessageSource,'error-without-message');
function errorShape(fn){try{fn(['yes'],{prompt(){return 'yes';}});assert.fail('expected throw');}catch(error){return {name:error.name,message:error.message,ownMessage:Object.hasOwn(error,'message')};}}
assert.deepEqual(errorShape(require(noMessage.prefix+'.compiler.cjs').run),errorShape(interpret(noMessageSource)));comparisons++;
const crypto=require('node:crypto');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,file))).digest('hex');
fs.writeFileSync(path.join(__dirname,'generated/validation.json'),JSON.stringify({
 semanticComparisons:comparisons,
 sourceHashes:Object.fromEntries(['jsmix.js','codegen.cjs','parse.cjs','binding-times.cjs','../../js-frontend/src/structured.rs'].map(file=>[file,hash(file)])),
 primaryResidualHash:hash('generated/prompt-print.output.txt'),
 diagnosticEnvironment:Object.fromEntries(Object.entries(process.env).filter(([key])=>/^(PE_|SPEC_WEIGHT|RESID_DEBUG)/.test(key)))
},null,2)+'\n');
console.log(`${comparisons} final semantic comparisons passed`);
