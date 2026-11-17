const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const M=require('../../demos/mogensen/engine.js');
const v=name=>({tag:'var',name});
const app=(fn,arg,stage='S')=>({tag:'app',fn,arg,stage});
const lam=(name,body,stage='S')=>({tag:'lam',name,body,stage});
const ls=(names,body)=>names.split(' ').reduceRight((b,n)=>lam(n,b),body);
const ld=(names,body)=>names.split(' ').reduceRight((b,n)=>lam(n,b,'D'),body);
const s=(fn,...args)=>args.reduce((f,x)=>app(f,x),fn);
const d=(fn,arg)=>app(fn,arg,'D');
const unit=ld('unit',v('unit'));
const recur=value=>s(v('run'),v('tail'),value);
const loop=s(M.PA.fn,ls('run program value',s(v('program'),
 ls('ignored',v('value')),
 ls('tail',d(ld('promptValue',recur(v('promptValue'))),d(v('prompt'),unit))),
 ls('tail',d(ld('ignoredPrint',recur(v('value'))),d(v('print'),v('value'))))
)));
const interpreter=ls('program',ld('prompt print initial',s(loop,v('program'),v('initial'))));
const residual=fs.readFileSync(path.join(__dirname,'lambda.output.txt'),'utf8').replace(/^---[^\n]*\n/,'');
const cogen=Function(residual+'\nreturn main;')();
const compiler=M.readback(cogen(M.quote(interpreter,true)));
const p2=M.readback(M.makeMix().mix(M.quote(M.PA,true))(M.quote(interpreter,true)));
assert(M.same(compiler,p2));
fs.writeFileSync(path.join(__dirname,'generated/prompt-print.compiler.lambda'),M.print(compiler)+'\n');
fs.writeFileSync(path.join(__dirname,'generated/prompt-print.compiler.json'),JSON.stringify(compiler,null,2)+'\n');

const {encode}=require('./prompt-print-program.cjs');
const compile=M.runtime().run(compiler);
const program=['prompt','print','prompt','print'];
const target=M.readback(compile(encode(program)));
const trace=[],inputs=['Ada','Grace'];
const result=M.runtime().run(target)(()=>inputs.shift())(value=>trace.push(value))(null);
assert.deepEqual(trace,['Ada','Grace']);assert.equal(result,'Grace');
module.exports={interpreter,compiler,encode};

const {factor,expand}=require("./derive.cjs");
const factored=factor(compiler);assert(M.same(compiler,expand(factored)));

const astring=require('../../tools/readable-js/node_modules/astring');
const acorn=require('../../tools/readable-js/node_modules/acorn');
const names={v0:'program',v4:'prompt',v8:'print',v12:'initial',v18:'run',v19:'remaining',v20:'value',v21:'ignored',v22:'tail',v29:'nextValue',v46:'tail',v53:'ignoredPrint',v42:'unit'};
const id=name=>({type:'Identifier',name});
const call=(callee,args)=>({type:'CallExpression',callee,arguments:args});
const arrow=(params,body)=>({type:'ArrowFunctionExpression',params:params.map(id),body,expression:true,async:false});
function chain(t){const args=[];while(t.tag==='app'){args.unshift(t.arg);t=t.fn;}return{head:t,args};}
function render(t){
 if(t.tag==='var')return id(names[t.name]||t.name);
 if(t.tag==='fix')return id('fix');
 if(t.tag==='lam')return arrow([names[t.name]||t.name],render(t.body));
 if(t.tag==='code'){
  if(t.kind==='variable'&&t.args[0].tag==='var')return call(id('reference'),[render(t.args[0])]);
  const params=[];let body=t;
  while(body.tag==='code'&&body.kind==='abstraction'&&body.args[0].tag==='lam'){
   params.push(names[body.args[0].name]||body.args[0].name);body=body.args[0].body;
  }
  if(params.length>0)return call(id('functionCode'),[{type:'Literal',value:params.length},arrow(params,render(body))]);

  if(t.kind==='application'&&t.args[0].tag==='code'&&t.args[0].kind==='abstraction'&&t.args[0].args[0].tag==='lam'){
   return call(id('bindCode'),[arrow([],render(t.args[1])),render(t.args[0].args[0])]);
  }
  return call({type:'MemberExpression',computed:false,object:id('code'),property:id(t.kind)},t.args.map(x=>arrow([],render(x))));
 }
 const c=chain(t);
 if(c.head.tag==='var'&&c.head.name==='v19'&&c.args.length===3){
  return call(id('matchProgram'),[render(c.head),{type:'ObjectExpression',properties:c.args.map((x,i)=>({type:'Property',key:id(['end','prompt','print'][i]),value:render(x),kind:'init',method:false,shorthand:false,computed:false}))}]);
 }
 return call(render(t.fn),[render(t.arg)]);
}
const ast={type:'Program',sourceType:'script',body:[{type:'VariableDeclaration',kind:'const',declarations:[{type:'VariableDeclarator',id:id('compile'),init:render(factored)}]}]};
const generator={...astring.GENERATOR,
 CallExpression(node,state){
  const normal=astring.generate(node);
  if(normal.length<90)return astring.GENERATOR.CallExpression.call(this,node,state);
  const wrap=node.callee.type==='Identifier'&&['bindCode','functionCode'].includes(node.callee.name)||node.callee.type==='MemberExpression';
  if(!wrap)return astring.GENERATOR.CallExpression.call(this,node,state);
  this[node.callee.type](node.callee,state);state.write('(\n');state.indentLevel++;
  node.arguments.forEach((arg,i)=>{state.write(state.indent.repeat(state.indentLevel));this[arg.type](arg,state);state.write(i+1<node.arguments.length?',\n':'\n');});
  state.indentLevel--;state.write(state.indent.repeat(state.indentLevel)+')');
 }
};
const output=astring.generate(ast,{generator});acorn.parse(output,{ecmaVersion:2022});
fs.writeFileSync(path.join(__dirname,'generated/prompt-print.compile.cjs'),'const {fix,code,bindCode,matchProgram,reference,functionCode}=require("../helpers.cjs");\n'+output+'\nmodule.exports={compile};\n');
if(require.main===module)console.log(output);
