/* Mogensen's five-case offline specializer; manual annotations follow
 * Wand (1993), sections 4 and 7. Pure lambda terms use a CBV fixed point Z
 * in place of Y because this runnable embedding uses JavaScript's CBV order.
 * No generated compiler or compiler-generator calls the host specializer.
 */
(function(root) {
'use strict';
const variable = name => ({tag:'var',name});
const app = (fn,arg,stage='S') => ({tag:'app',fn,arg,stage});
const lam = (name,body,stage='S') => ({tag:'lam',name,body,stage});
const v=variable, s=app, d=(f,x)=>app(f,x,'D');
const ls=(names,b)=>names.split(' ').reduceRight((b,n)=>lam(n,b),b);
const ld=(names,b)=>names.split(' ').reduceRight((b,n)=>lam(n,b,'D'),b);
const calls=(fn,...args)=>args.reduce((f,x)=>s(f,x),fn);
const Z=ls('h',s(ls('x',s(v('h'),ls('z',calls(v('x'),v('x'),v('z'))))),ls('x',s(v('h'),ls('z',calls(v('x'),v('x'),v('z')))))));
// P^a is annotated P, not a handwritten compiler generator.
const PA=s(Z,ls('p m',calls(v('m'),
 ls('x',v('x')),
 ls('w u',d(s(v('p'),v('w')),s(v('p'),v('u')))),
 ls('w',ld('x',s(v('p'),s(v('w'),v('x'))))),
 ls('w u',ld('a b c',d(d(v('b'),s(v('p'),v('w'))),s(v('p'),v('u'))))),
 ls('w',ld('a b c',d(v('c'),ld('x',s(v('p'),s(v('w'),ld('a b c',d(v('a'),v('x')))))))))
)));
const EA=s(Z,ls('e m',calls(v('m'),
 ls('x',v('x')),
 ls('f x',d(s(v('e'),v('f')),s(v('e'),v('x')))),
 ls('b',ld('x',s(v('e'),s(v('b'),v('x')))))
)));
// A second interpreter: evaluate the program, then apply its result twice.
// This has the same static syntax traversal as E, with a residual wrapper.
const TWICE=ls('program',ld('x',d(s(EA,v('program')),d(s(EA,v('program')),v('x')))));

function curryCases(n, choose, handlers=[]) {
 return handler => handlers.length+1===n ? choose([...handlers,handler]) : curryCases(n,choose,[...handlers,handler]);
}
const Var=x=>curryCases(3,h=>h[0](x));
const App=f=>x=>curryCases(3,h=>h[1](f)(x));
const Abs=b=>curryCases(3,h=>h[2](b));
function quote(term, annotated=false, env=Object.create(null)) {
 const n=annotated?5:3;
 if(term.tag==='var') {
  if(!Object.hasOwn(env,term.name)) throw new Error('Unbound variable: '+term.name);
  return curryCases(n,h=>h[0](env[term.name]));
 }
 if(term.tag==='app') {
  const f=quote(term.fn,annotated,env), x=quote(term.arg,annotated,env);
  const i=annotated && term.stage==='D'?3:1;
  return curryCases(n,h=>h[i](f)(x));
 }
 const i=annotated && term.stage==='D'?4:2;
 return curryCases(n,h=>h[i](x=>quote(term.body,annotated,Object.assign(Object.create(null),env,{[term.name]:x}))));
}
function makeMix(limit=200000) {
 const stats={visits:0,variable:0,staticApply:0,staticLambda:0,dynamicApply:0,dynamicLambda:0};
 function mix(t) {
  if(++stats.visits>limit) throw new Error('Specialization budget exceeded');
  return t(x=>{stats.variable++;return x;})
   (f=>x=>{stats.staticApply++;return mix(f)(mix(x));})
   (b=>{stats.staticLambda++;return x=>mix(b(x));})
   (f=>x=>{stats.dynamicApply++;return App(mix(f))(mix(x));})
   (b=>{stats.dynamicLambda++;return Abs(x=>mix(b(Var(x))));});
 }
 return {mix,stats};
}
function readback(code,limit=100000) {
 let serial=0,nodes=0;
 function go(c) {
  if(++nodes>limit) throw new Error('Readback budget exceeded');
  return c(x=>{if(!x || !x.ref) throw new Error('Invalid residual variable');return v(x.ref);})
   (f=>x=>app(go(f),go(x)))
   (b=>{const ref='v'+serial++;return lam(ref,go(b({ref})));});
 }
 return go(code);
}
function runtime(limit=2000000) {
 const stats={steps:0};
 function run(t,env=Object.create(null)) {
  if(++stats.steps>limit) throw new Error('Evaluation budget exceeded');
  if(t.tag==='var') {if(!Object.hasOwn(env,t.name)) throw new Error('Unbound variable: '+t.name);return env[t.name];}
  if(t.tag==='lam') return x=>run(t.body,Object.assign(Object.create(null),env,{[t.name]:x}));
  const f=run(t.fn,env), x=run(t.arg,env);
  if(typeof f!=='function') throw new Error('Application expected a function');
  return f(x);
 }
 return {run,stats};
}
function parse(source) {
 const tokens=source.match(/\s+|[λ\\().]|[A-Za-z_][A-Za-z_0-9]*|./gu)?.filter(t=>!/^\s+$/.test(t))||[];
 let i=0;
 const peek=()=>tokens[i];
 function expression() {
  if(peek()==='λ'||peek()==='\\') {
   i++;const names=[];
   while(/^[A-Za-z_][A-Za-z_0-9]*$/.test(peek()||'')) names.push(tokens[i++]);
   if(!names.length || tokens[i++]!=='.') throw new Error('Expected λname. body');
   return names.reduceRight((b,n)=>lam(n,b),expression());
  }
  let out=atom();
  while(i<tokens.length && peek()!==')') {
   if(peek()==='λ'||peek()==='\\') {out=app(out,expression());break;}
   out=app(out,atom());
  }
  return out;
 }
 function atom() {
  const t=tokens[i++];
  if(t==='(') {const e=expression();if(tokens[i++]!==')') throw new Error('Expected closing parenthesis');return e;}
  if(t && /^[A-Za-z_][A-Za-z_0-9]*$/.test(t)) return v(t);
  throw new Error('Expected a variable or parenthesized term');
 }
 const result=expression();
 if(i!==tokens.length) throw new Error('Unexpected token: '+peek());
 let count=0;
 function check(t,names) {
  if(++count>1200) throw new Error('Program is too large (maximum 1,200 nodes)');
  if(t.tag==='var'&&!names.includes(t.name)) throw new Error('Unbound variable: '+t.name);
  if(t.tag==='lam') check(t.body,[...names,t.name]);
  if(t.tag==='app') {check(t.fn,names);check(t.arg,names);}
 }
 check(result,[]);return result;
}
function print(t,annotated=false,prec=0) {
 if(t.tag==='var') return t.name;
 if(t.tag==='lam') {
  const mark=annotated?(t.stage==='D'?'λᴰ':'λˢ'):'λ';
  const text=mark+t.name+'. '+print(t.body,annotated,0);
  return prec>0?'('+text+')':text;
 }
 const text=print(t.fn,annotated,1)+(annotated&&t.stage==='D'?' ·ᴰ ':' ')+print(t.arg,annotated,2);
 return prec>1?'('+text+')':text;
}
function canonical(t,env=[]) {
 if(t.tag==='var') return env.includes(t.name)?['v',env.lastIndexOf(t.name)-env.length]:['free',t.name];
 if(t.tag==='lam') return ['l',canonical(t.body,[...env,t.name])];
 return ['a',canonical(t.fn,env),canonical(t.arg,env)];
}
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const size=t=>t.tag==='var'?1:1+(t.tag==='lam'?size(t.body):size(t.fn)+size(t.arg));
const numeral=n=>ls('f x',Array.from({length:n}).reduce(x=>s(v('f'),x),v('x')));
function churchResult(fn,n) {
 const rt=runtime();const input=rt.run(numeral(n));
 const output=fn(input)(x=>x+1)(0);
 if(!Number.isSafeInteger(output)||output<0||output>1000000) throw new Error('Program did not return a small Church numeral');
 return output;
}
const interpreters={lambda:EA,twice:TWICE};
function project(which,program,interpreter='lambda') {
 const start=performance.now();const I=interpreters[interpreter];
 if(!I) throw new Error('Unknown interpreter');
 const m=makeMix(), r=runtime();const stages=[];
 let target,compiler,cogen;
 if(which===1) {
  target=readback(m.mix(quote(I,true))(quote(program)));
  stages.push({label:'Specialize interpreter + program',term:target});
 } else if(which===2) {
  compiler=readback(m.mix(quote(PA,true))(quote(I,true)));
  stages.push({label:'Generate compiler',term:compiler});
  target=readback(r.run(compiler)(quote(program)));
  stages.push({label:'Run generated compiler on program',term:target});
 } else if(which===3) {
  cogen=readback(m.mix(quote(PA,true))(quote(PA,true)));
  stages.push({label:'Generate compiler generator',term:cogen});
  compiler=readback(r.run(cogen)(quote(I,true)));
  stages.push({label:'Run compiler generator on interpreter',term:compiler});
  target=readback(r.run(compiler)(quote(program)));
  stages.push({label:'Run generated compiler on program',term:target});
 } else throw new Error('Unknown projection');
 const direct=readback(makeMix().mix(quote(I,true))(quote(program)));
 if(!same(target,direct)) throw new Error('Generated target differs from direct specialization');
 if(compiler) {
  const reference=readback(makeMix().mix(quote(PA,true))(quote(I,true)));
  if(!same(compiler,reference)) throw new Error('Generated compiler differs from direct self-application');
 }
 return {target,compiler,cogen,stages,mixStats:m.stats,runtimeStats:r.stats,ms:performance.now()-start,verified:true};
}
const API={PA,EA,TWICE,parse,print,quote,readback,makeMix,runtime,same,size,numeral,churchResult,project,interpreters};
if(typeof module!=='undefined'&&module.exports) module.exports=API;
else root.Mogensen=API;
})(typeof globalThis!=='undefined'?globalThis:this);
