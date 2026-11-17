const fs=require('node:fs');
const M=require('../../demos/mogensen/engine.js');
const cogen=M.readback(M.makeMix().mix(M.quote(M.PA,true))(M.quote(M.PA,true)));
const v=(n)=>({tag:'var',name:n});
function has(t,names){if(t.tag==='var')return names.includes(t.name);if(t.tag==='lam')return has(t.body,names.filter(n=>n!==t.name));return has(t.fn,names)||has(t.arg,names);}
function recognize(t){
 if(M.same(t,M.PA.fn))return {tag:'fix'};
 let n=t;const names=[];for(let i=0;i<3;i++){if(n.tag!=='lam')return null;names.push(n.name);n=n.body;}
 if(n.tag!=='app')return null;
 if(n.fn.tag==='var'&&n.fn.name===names[0]&&!has(n.arg,names))return {tag:'variable',args:[n.arg]};
 if(n.fn.tag==='var'&&n.fn.name===names[2]&&!has(n.arg,names))return {tag:'abstraction',args:[n.arg]};
 if(n.fn.tag==='app'&&n.fn.fn.tag==='var'&&n.fn.fn.name===names[1]&&!has(n.fn.arg,names)&&!has(n.arg,names))return {tag:'application',args:[n.fn.arg,n.arg]};
 return null;
}
const names={v5:'specialize',v6:'term',v7:'value',v8:'left',v9:'right',v13:'body',v21:'left',v22:'right',v44:'body'};
function render(t){
 const shape=recognize(t);
 if(shape?.tag==='fix')return 'fix';
 if(shape)return 'code.'+shape.tag+'('+shape.args.map(arg=>'() => '+render(arg)).join(', ')+')';
 if(t.tag==='var')return names[t.name]||t.name;
 if(t.tag==='lam')return '('+(names[t.name]||t.name)+') => '+render(t.body);
 return '('+render(t.fn)+')('+render(t.arg)+')';
}
const raw='const cogen = '+render(cogen)+';\n';
const acorn=require('../../tools/readable-js/node_modules/acorn');
const astring=require('../../tools/readable-js/node_modules/astring');
const pretty=astring.generate(acorn.parse(raw,{ecmaVersion:2022}));
fs.writeFileSync(__dirname+'/cogen.helper.js',pretty);
console.log(pretty);
