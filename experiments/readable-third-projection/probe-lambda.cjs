const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const M=require('../../demos/mogensen/engine.js');
let serial=0;
function quote(term,env={}){
 const hs=Array.from({length:5},()=> 'h'+serial++);
 let body;
 if(term.tag==='var')body=hs[0]+'('+env[term.name]+')';
 else if(term.tag==='app')body=hs[term.stage==='D'?3:1]+'('+quote(term.fn,env)+')('+quote(term.arg,env)+')';
 else{const x='x'+serial++;body=hs[term.stage==='D'?4:2]+'(('+x+') => '+quote(term.body,{...env,[term.name]:x})+')';}
 return hs.map(h=>'('+h+') => ').join('')+body;
}
const kernel=`
function variable(x) { return a => b => c => a(x); }
function application(f, x) { return a => b => c => b(f)(x); }
function abstraction(body) { return a => b => c => c(body); }
function mix(term) {
 return term(x => x)
   (f => x => mix(f)(mix(x)))
   (body => x => mix(body(x)))
   (f => x => application(mix(f), mix(x)))
   (body => abstraction(x => mix(body(variable(x)))));
}
function evaluate(term) {
 return term(x => x)
   (f => x => evaluate(f)(evaluate(x)))
   (body => x => evaluate(body(x)));
}
`;
const input=kernel+'\nfunction main(interpreter) {\nvar P = '+quote(M.PA)+';\nvar generator = mix(P)(P);\nreturn evaluate(generator)(interpreter);\n}\n';
fs.writeFileSync(path.join(__dirname,'lambda.input.js'),input);
const r=spawnSync(path.join(__dirname,'../../target/release/js-frontend'),['--js',path.join(__dirname,'lambda.input.js')],{encoding:'utf8',timeout:30000,maxBuffer:32*1024*1024});
fs.writeFileSync(path.join(__dirname,'lambda.output.txt'),r.stdout||'');
fs.writeFileSync(path.join(__dirname,'lambda.trace.txt'),r.stderr||'');
console.log({status:r.status,error:r.error?.message,input:input.length,output:r.stdout?.length,headline:r.stdout?.split('\n')[0],stderr:r.stderr?.slice(-1000)});
