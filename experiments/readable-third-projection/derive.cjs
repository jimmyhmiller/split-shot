const fs=require('node:fs'),path=require('node:path');
const acorn=require('../../tools/readable-js/node_modules/acorn');
const astring=require('../../tools/readable-js/node_modules/astring');
const M=require('../../demos/mogensen/engine.js');
const dir=path.join(__dirname,'generated');fs.mkdirSync(dir,{recursive:true});
// This is the actual third projection, not a hand-written compiler generator.
const PA=M.quote(M.PA,true);
const evaluation=M.runtime();
const raw=M.readback(evaluation.run(M.PA)(PA)(PA));
const reference=M.readback(M.makeMix().mix(PA)(PA));
if(!M.same(raw,reference))throw new Error('Executed P differs from its five-rule host embedding');
fs.writeFileSync(path.join(dir,'specializer.annotated.json'),JSON.stringify(M.PA,null,2)+'\n');
fs.writeFileSync(path.join(dir,'cogen.raw.json'),JSON.stringify(raw,null,2)+'\n');
fs.writeFileSync(path.join(dir,'cogen.raw.lambda'),M.print(raw)+'\n');
let serial=0;
const variable=name=>({tag:'var',name});
const lam=(name,body)=>({tag:'lam',name,body});
const app=(fn,arg)=>({tag:'app',fn,arg});
function free(t,names){if(t.tag==='var')return names.includes(t.name);if(t.tag==='lam')return free(t.body,names.filter(n=>n!==t.name));return free(t.fn,names)||free(t.arg,names);}
function constructor(t){
 let body=t;const names=[];
 for(let i=0;i<3;i++){if(body.tag!=='lam')return null;names.push(body.name);body=body.body;}
 if(body.tag!=='app')return null;
 if(body.fn.tag==='var'&&body.fn.name===names[0]&&!free(body.arg,names))return {kind:'variable',args:[body.arg]};
 if(body.fn.tag==='var'&&body.fn.name===names[2]&&!free(body.arg,names))return {kind:'abstraction',args:[body.arg]};
 if(body.fn.tag==='app'&&body.fn.fn.tag==='var'&&body.fn.fn.name===names[1]&&!free(body.fn.arg,names)&&!free(body.arg,names))return {kind:'application',args:[body.fn.arg,body.arg]};
 return null;
}
function quoted(t){
 let body=t;const names=[];
 for(let i=0;i<3;i++){
  const c=constructor(body);if(c?.kind!=='abstraction'||c.args[0].tag!=='lam')return null;
  names.push(c.args[0].name);body=c.args[0].body;
 }
 const c=constructor(body);if(c?.kind!=='application')return null;
 const fn=constructor(c.args[0]);
 if(fn?.kind==='variable'&&fn.args[0].tag==='var'&&!free(c.args[1],names)){
  if(fn.args[0].name===names[0])return {kind:'variable',args:[c.args[1]]};
  if(fn.args[0].name===names[2])return {kind:'abstraction',args:[c.args[1]]};
 }
 if(fn?.kind==='application'){
  const head=constructor(fn.args[0]);
  if(head?.kind==='variable'&&head.args[0].tag==='var'&&head.args[0].name===names[1]&&!free(fn.args[1],names)&&!free(c.args[1],names))return {kind:'application',args:[fn.args[1],c.args[1]]};
 }
 return null;
}
const counts={fix:0,code:0,quote:0};
function factor(t){
 if(M.same(t,M.PA.fn)){counts.fix++;return {tag:'fix'};}
 const q=quoted(t);if(q){counts.quote++;return {tag:'quote',kind:q.kind,args:q.args.map(factor)};}
 const c=constructor(t);if(c){counts.code++;return {tag:'code',kind:c.kind,args:c.args.map(factor)};}
 if(t.tag==='var')return t;
 if(t.tag==='lam')return {...t,body:factor(t.body)};
 return {...t,fn:factor(t.fn),arg:factor(t.arg)};
}
const factored=factor(raw);
function encoded(kind,args){
 const a='_h'+serial++,b='_h'+serial++,c='_h'+serial++;
 const body=kind==='variable'?app(variable(a),args[0]):kind==='application'?app(app(variable(b),args[0]),args[1]):app(variable(c),args[0]);
 return lam(a,lam(b,lam(c,body)));
}
function quoteEncoding(kind,args){
 const a='_q'+serial++,b='_q'+serial++,c='_q'+serial++;
 const cv=x=>({tag:'code',kind:'variable',args:[variable(x)]});
 const ca=(f,x)=>({tag:'code',kind:'application',args:[f,x]});
 const cl=(x,body)=>({tag:'code',kind:'abstraction',args:[lam(x,body)]});
 const body=kind==='variable'?ca(cv(a),args[0]):kind==='application'?ca(ca(cv(b),args[0]),args[1]):ca(cv(c),args[0]);
 return cl(a,cl(b,cl(c,body)));
}
function expand(t){
 if(t.tag==='fix')return M.PA.fn;
 if(t.tag==='quote')return expand(quoteEncoding(t.kind,t.args));
 if(t.tag==='code')return encoded(t.kind,t.args.map(expand));
 if(t.tag==='lam')return lam(t.name,expand(t.body));
 if(t.tag==='app')return app(expand(t.fn),expand(t.arg));
 return t;
}
// Stronger than differential testing: helper expansion reconstructs the exact
// derived lambda term up to alpha-renaming.
if(!M.same(raw,expand(factored)))throw new Error('Helper extraction changed the third-projection term');
function render(factored, artifact, arity, recursiveName) {
const names={};
const rec=factored.arg;names[rec.name]=recursiveName;names[rec.body.name]='term';
function chain(t){const args=[];while(t.tag==='app'){args.unshift(t.arg);t=t.fn;}return {head:t,args};}
const cases=chain(rec.body.body).args;
for(let i=0;i<arity;i++){
 let n=cases[i];const hints=[['value'],['left','right'],['body'],['left','right'],['body']][i];
 for(const hint of hints){names[n.name]=hint;n=n.body;}
}
let bound=0;
function rename(t){
 if(t.tag==='lam'){if(!names[t.name])names[t.name]='bound'+(++bound);rename(t.body);}
 else if(t.tag==='app'){rename(t.fn);rename(t.arg);}
 else if(t.args)t.args.forEach(rename);
}
rename(factored);
const id=name=>({type:'Identifier',name});
const call=(callee,args)=>({type:'CallExpression',callee,arguments:args,optional:false});
const arrow=(params,body)=>({type:'ArrowFunctionExpression',id:null,params:params.map(id),body,generator:false,async:false,expression:true});
const keys=arity===3?['variable','application','abstraction']:['variable','staticApplication','staticAbstraction','dynamicApplication','dynamicAbstraction'];
function js(t){
 if(t.tag==='fix')return id('fix');
 if(t.tag==='code'||t.tag==='quote')return call({type:'MemberExpression',computed:false,optional:false,object:id(t.tag),property:id(t.kind)},t.args.map(a=>arrow([],js(a))));
 if(t.tag==='var')return id(names[t.name]||t.name);
 if(t.tag==='lam')return arrow([names[t.name]||t.name],js(t.body));
 const c=chain(t);
 if(c.head.tag==='var'&&names[c.head.name]==='term'&&c.args.length===arity){
  return call(id(arity===3?'matchCode':'match'),[js(c.head),{type:'ObjectExpression',properties:c.args.map((arg,i)=>({type:'Property',key:id(keys[i]),value:js(arg),computed:false,method:false,shorthand:false,kind:'init'}))}]);
 }
 return call(js(t.fn),[js(t.arg)]);
}
const decl={type:'Program',sourceType:'script',body:[{type:'VariableDeclaration',kind:'const',declarations:[{type:'VariableDeclarator',id:id(artifact),init:js(factored)}]}]};
const generator={...astring.GENERATOR,
  CallExpression(node,state){
    const member=node.callee.type==='MemberExpression'&&node.callee.object.type==='Identifier'&&['code','quote'].includes(node.callee.object.name);
    if(!member||astring.generate(node).length<75)return astring.GENERATOR.CallExpression.call(this,node,state);
    this.MemberExpression(node.callee,state);state.write('(\n');state.indentLevel++;
    node.arguments.forEach((arg,i)=>{state.write(state.indent.repeat(state.indentLevel));this[arg.type](arg,state);state.write(i+1<node.arguments.length?',\n':'\n');});
    state.indentLevel--;state.write(state.indent.repeat(state.indentLevel)+')');
  }
};
const output=astring.generate(decl,{generator});
acorn.parse(output,{ecmaVersion:2022});
fs.writeFileSync(path.join(dir,artifact+'.js'),output);
fs.writeFileSync(path.join(dir,artifact+'.cjs'),'const {fix,code,quote,match,matchCode}=require("../helpers.cjs");\n'+output+'\nmodule.exports={'+artifact+'};\n');
return output;
}
const output=render(factored,'cogen',5,'generate');
const generator=require('./generated/cogen.cjs').cogen;
const compiler=M.readback(generator(M.quote(M.interpreters.lambda,true)));
// Cross-check and use the compiler emitted by split-shot's residual generator.
const residual=fs.readFileSync(path.join(__dirname,'lambda.output.txt'),'utf8').replace(/^---[^\n]*\n/,'');
const rustGenerator=Function(residual+'\nreturn main;')();
const rustCompiler=M.readback(rustGenerator(M.quote(M.interpreters.lambda,true)));
if(!M.same(compiler,rustCompiler))throw new Error('split-shot generator/compiler differs from pure P3');
const compilerFactored=factor(rustCompiler);
if(!M.same(compiler,expand(compilerFactored)))throw new Error('Compiler helper extraction changed the derived term');
const compilerOutput=render(compilerFactored,'compile',3,'compileTerm');
fs.writeFileSync(path.join(dir,'derivation.json'),JSON.stringify({rawNodes:M.size(raw),pureSpecializerSteps:evaluation.stats.steps,rawCharacters:M.print(raw).length,helperExtraction:counts,expandedAlphaEquivalent:true,compilerNodes:M.size(compiler),compilerExpandedAlphaEquivalent:true,compilerOutputLines:compilerOutput.trimEnd().split('\n').length},null,2)+'\n');
if(require.main===module)console.log(compilerOutput);

module.exports={factor,expand};
