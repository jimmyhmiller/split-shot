const M=require('../../demos/mogensen/engine.js');
// Backend for the generated compiler's curried (prompt, print, initial) ABI.
// io.prompt ignores its unit argument; io.print preserves its method receiver.
function javascript(term) {
 const params=[];let body=term;
 for(let i=0;i<3;i++){
  if(body.tag!=='lam')throw new Error('Expected three runtime parameters');
  params.push(body.name);body=body.body;
 }
 let serial=0;
 function uses(t,name){return t.tag==='var'?t.name===name:t.tag==='lam'?t.name!==name&&uses(t.body,name):uses(t.fn,name)||uses(t.arg,name);}
 function expression(t,env,lines){
  if(t.tag==='var'){
   const value=env[t.name];if(!value)throw new Error('Unbound target variable '+t.name);
   if(typeof value!=='string')throw new Error('IO operation used as a first-class value');
   return value;
  }
  if(t.tag==='lam'){
   const name='value'+serial++,nested=[];
   const result=expression(t.body,{...env,[t.name]:name},nested);
   return '('+name+') => { '+nested.join(' ')+' return '+result+'; }';
  }
  if(t.fn.tag==='lam'){
   const argument=expression(t.arg,env,lines);
   if(!uses(t.fn.body,t.fn.name)){
    lines.push(argument+';');return expression(t.fn.body,env,lines);
   }
   const name='value'+serial++;lines.push('const '+name+' = '+argument+';');
   return expression(t.fn.body,{...env,[t.fn.name]:name},lines);
  }
  if(t.fn.tag==='var'&&typeof env[t.fn.name]==='object'){
   const op=env[t.fn.name].operation;
   if(op==='prompt'){
    // Still evaluate a nontrivial ignored argument for its effects.
    if(t.arg.tag!=='lam'&&t.arg.tag!=='var')lines.push(expression(t.arg,env,lines)+';');
    return 'io.prompt()';
   }
   return 'io.print('+expression(t.arg,env,lines)+')';
  }
  const fn=expression(t.fn,env,lines),name='fn'+serial++;
  lines.push('const '+name+' = '+fn+';');
  return name+'('+expression(t.arg,env,lines)+')';
 }
 const lines=[];
 const result=expression(body,{[params[0]]:{operation:'prompt'},[params[1]]:{operation:'print'},[params[2]]:'null'},lines);
 return 'function (io) {\n'+lines.map(x=>'  '+x+'\n').join('')+'  return '+result+';\n}';
}
module.exports={javascript};
