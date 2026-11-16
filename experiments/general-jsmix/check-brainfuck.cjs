// The Brainfuck compiler split-shot derives from interpreters/brainfuck.js:
// each program's target, run against a memory host, does what the interpreter
// does (output, tape, result), and is byte for byte what jsmix gives run
// directly (the first projection).
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {derive}=require('./derive.cjs'),codegen=require('./codegen.cjs');
const source=fs.readFileSync(path.join(__dirname,'interpreters/brainfuck.js'),'utf8');
const {ast,prefix}=derive(source,'brainfuck');
const compiler=require(prefix+'.compiler.cjs');
const mix=Function('codegen',fs.readFileSync(path.join(__dirname,'jsmix.js'),'utf8')+'\nreturn jsmix;')(codegen);
const interp=Function(source+'\nreturn interp;')();
function host(input){
 const tape=new Map(),out=[];let pos=0;
 return {io:{load:a=>tape.get(a)||0,store:(a,v)=>{tape.set(a,v&255);},read:()=>pos<input.length?input[pos++]:0,write:v=>{out.push(v);}},out,tape};
}
const programs=[
 ['echo',',.',[65]],
 ['double',',[->++<]>.',[21]],
 ['add',',>,[-<+>]<.',[3,4]],
 ['nested','++[>++[>++<-]<-]>>.',[]],
 ['hello','++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.',[]],
 ['empty','',[]],
 ['skip','[.]+.',[]],
];
let checks=0;
for(const [name,program,input] of programs){
 const target=compiler.compile(program);
 assert.equal(target,mix(ast,'interp',program),name+': differs from jsmix run directly');
 const a=host(input),b=host(input);
 assert.deepEqual([compiler.run(program,a.io),a.out,[...a.tape]],[interp(program,b.io),b.out,[...b.tape]],name);
 checks+=2;
}
assert.throws(()=>compiler.compile('[+'),/Unmatched \[ at 0/);checks++;
assert.ok(!/evalStmt|evalExpr|envLookup|tag ===/.test(fs.readFileSync(prefix+'.compiler.cjs','utf8')),'jsmix is left in the compiler');
console.log(checks+' Brainfuck checks passed, Hello World among them');
