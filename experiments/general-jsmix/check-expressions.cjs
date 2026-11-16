// The expression compiler split-shot derives from interpreters/expressions.js
// (recursive on the program): targets do what the interpreter does, and are
// what jsmix gives run directly.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {derive}=require('./derive.cjs'),codegen=require('./codegen.cjs');
const source=fs.readFileSync(path.join(__dirname,'interpreters/expressions.js'),'utf8');
const {ast,prefix}=derive(source,'expressions');
const compiler=require(prefix+'.compiler.cjs');
const mix=Function('codegen',fs.readFileSync(path.join(__dirname,'jsmix.js'),'utf8')+'\nreturn jsmix;')(codegen);
const interp=Function(source+'\nreturn interp;')();
function host(input){const out=[];let pos=0;return {io:{read:()=>input[pos++%input.length],print:v=>{out.push(v);}},out};}
const programs=[
 ['num',['num',7]],
 ['sum',['+',['input'],['*',['num',2],['input']]]],
 ['max',['print',['if',['<',['input'],['num',10]],['num',10],['input']]]],
 ['nested-if',['if',['<',['input'],['num',0]],['-',['num',0],['input']],['if',['<',['input'],['num',100]],['print',['input']],['num',100]]]],
];
let checks=0;
for(const [name,program] of programs)for(const input of [[3,4],[-5,20],[50,150],[200,1]]){
 const target=compiler.compile(program);
 assert.equal(target,mix(ast,'interp',program),name+': differs from jsmix run directly');
 const a=host(input),b=host(input);
 assert.deepEqual([compiler.run(program,a.io),a.out],[interp(program,b.io),b.out],name+' '+input);
 checks+=2;
}
assert.ok(!/evalStmt|evalExpr|envLookup|tag ===/.test(fs.readFileSync(prefix+'.compiler.cjs','utf8')),'jsmix is left in the compiler');
console.log(checks+' expression-compiler checks passed');
