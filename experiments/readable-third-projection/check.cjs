const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const M=require('../../demos/mogensen/engine.js');
const {cogen}=require('./generated/cogen.cjs');
const readableCompile=require('./generated/compile.cjs').compile;
const examples=[
 ['add-two','λn. λf. λx. f (f (n f x))',n=>n+2],
 ['double','λn. λf. λx. n f (n f x)',n=>2*n],
 ['square','λn. λf. n (n f)',n=>n*n],
 ['identity','λn. n',n=>n],
 ['constant','λn. λf. λx. f x',()=>1],
 ['shadowing','λn. (λn. n) n',n=>n],
 ['capture-sensitive','λn. (λf. λn. f) n',null]
];
let compilerChecks=0,targetChecks=0,numericChecks=0;
const PA=M.quote(M.PA,true),runtime=M.runtime();
const P=M.runtime().run(M.PA);
for(const [name,interpreter]of Object.entries(M.interpreters)){
 const quoted=M.quote(interpreter,true);
 const compiler=M.readback(cogen(quoted));
 const p2=M.readback(P(PA)(quoted));
 const independent=M.readback(M.makeMix().mix(PA)(quoted));
 assert(M.same(compiler,p2),name+' P3/P2');assert(M.same(compiler,independent),name+' kernel');compilerChecks+=2;
 fs.writeFileSync(path.join(__dirname,'generated','compiler-'+name+'.json'),JSON.stringify(compiler,null,2)+'\n');
 fs.writeFileSync(path.join(__dirname,'generated','compiler-'+name+'.lambda'),M.print(compiler)+'\n');
 const compile=M.runtime().run(compiler);
 for(const [label,source,oracle]of examples){
  const program=M.parse(source),qprogram=M.quote(program);
  const target=M.readback(compile(qprogram));
  const p1=M.readback(M.makeMix().mix(quoted)(qprogram));
  assert(M.same(target,p1),name+' '+label+' target');targetChecks++;
  if(name==='lambda'){assert(M.same(M.readback(readableCompile(qprogram)),target),label+' readable compiler');targetChecks++;}
  fs.writeFileSync(path.join(__dirname,'generated','target-'+name+'-'+label+'.lambda'),M.print(target)+'\n');
  if(!oracle)continue;
  const run=M.runtime().run(target);
  const original=M.runtime().run(interpreter)(qprogram);
  for(let input=0;input<=6;input++){
   const expected=name==='twice'?oracle(oracle(input)):oracle(input);
   assert.equal(M.churchResult(run,input),expected,name+' '+label+' '+input);
   assert.equal(M.churchResult(original,input),expected);numericChecks+=2;
  }
 }
}
const source=fs.readFileSync(path.join(__dirname,'generated/cogen.js'),'utf8');
const helpers=fs.readFileSync(path.join(__dirname,'helpers.cjs'),'utf8');
assert.ok(!/makeMix|\.mix\(|require\(|specializer\.annotated|evalExpr/.test(source));
assert.ok(!/makeMix|\.mix\(|mogensen|evalExpr/.test(helpers));
const report={compilerChecks,targetChecks,numericChecks,rawNodes:M.size(M.readback(P(PA)(PA))),helperExpandedAlphaEquivalent:true,noSpecializerCallsInGeneratedCode:true};
fs.writeFileSync(path.join(__dirname,'generated/validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(report);
