// The third projection as a plain program (playground/examples/lambda):
// split-shot specializes its main, and what comes out must be a compiler
// generator. Its compilers are checked against the specializer applied to each
// interpreter directly, their targets against the first projection, and the
// targets' results against the interpreters'.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const M=require('../../demos/mogensen/engine.js');
const ROOT=path.join(__dirname,'../..');
const LAMBDA=path.join(ROOT,'playground/examples/lambda');
const specializer=fs.readFileSync(path.join(LAMBDA,'specializer.js'),'utf8');
// (Outside any package.json, so the file is a plain script.)
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cogen-'));
function specialize(name,source){
 fs.writeFileSync(path.join(dir,name),source);
 const out=execFileSync(path.join(ROOT,'target/release/js-frontend'),['--js',path.join(dir,name)],{encoding:'utf8',maxBuffer:1<<26});
 return out.slice(out.indexOf('\n')+1);
}
const residual=specialize('cogen.js',specializer+fs.readFileSync(path.join(LAMBDA,'cogen.js'),'utf8'));
assert.ok(!/\bPA\b|\bLS\b|\bLD\b|\bV\(|name:|tag:/.test(residual),"the specializer term is left in the residual");
const cogen=Function(residual+'\nreturn main;')();
const examples=[
 ['add-two','λn. λf. λx. f (f (n f x))',n=>n+2],
 ['double','λn. λf. λx. n f (n f x)',n=>2*n],
 ['square','λn. λf. n (n f)',n=>n*n],
 ['identity','λn. n',n=>n],
 ['shadowing','λn. (λn. n) n',n=>n],
];
let compilers=0,targets=0,numbers=0;
const PA=M.quote(M.PA,true);
for(const [name,interpreter] of Object.entries(M.interpreters)){
 const quoted=M.quote(interpreter,true);
 const compiler=M.readback(cogen(quoted));
 const direct=M.readback(M.makeMix().mix(PA)(quoted));
 assert(M.same(compiler,direct),name+': compiler differs from mix(mix, interpreter)');compilers++;
 const compile=M.runtime().run(compiler);
 for(const [label,source,oracle] of examples){
  const qprogram=M.quote(M.parse(source));
  const target=M.readback(compile(qprogram));
  assert(M.same(target,M.readback(M.makeMix().mix(quoted)(qprogram))),name+' '+label+': target differs from mix(interpreter, program)');targets++;
  const run=M.runtime().run(target);
  for(let n=0;n<=6;n++){
   assert.equal(M.churchResult(run,n),name==='twice'?oracle(oracle(n)):oracle(n),name+' '+label+' '+n);numbers++;
  }
 }
}
// All three projections in a row (all-three.js): what is left is the compiled
// program, which gives the square, and is what the first projection (the
// interpreter specialized to the program) and the second (a compiler made by
// specializing the specializer to the interpreter) leave of the same program.
const allThree=fs.readFileSync(path.join(LAMBDA,'all-three.js'),'utf8');
const targetCode=specialize('all-three.js',specializer+allThree);
const square=Function(targetCode+'\nreturn main;')();
let squares=0;
for(let k=0;k<=9;k++){assert.equal(square(k),k*k,'square of '+k);squares++;}
assert.ok(!/\bmix\b|\bevaluate\b|\bPA\b|=>/.test(targetCode),'the projections are left in the target: '+targetCode);
const mainOf=(body)=>allThree.replace(/function main\(k\) \{[\s\S]*$/,'function main(k) {\n'+body+'\n}\n');
assert.equal(specialize('p1.js',specializer+mainOf('  return count(evaluate(mix(EA())(square()))(church(k)));')),targetCode,'differs from the first projection');
assert.equal(specialize('p2.js',specializer+mainOf('  var compiler = evaluate(mix(PA())(EA()));\n  return count(evaluate(compiler(square()))(church(k)));')),targetCode,'differs from the second projection');
console.log(`all three projections: the target squares k for k = 0..9 (${squares} checks), and is byte for byte what the first and second projections give`);
console.log(`residual ${residual.length} bytes; ${compilers} compilers equal mix(mix, interpreter); ${targets} targets equal mix(interpreter, program); ${numbers} results right`);
