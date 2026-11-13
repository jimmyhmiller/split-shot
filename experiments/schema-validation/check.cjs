const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const load = file => vm.runInThisContext(`(function(){${fs.readFileSync(path.join(__dirname,file),'utf8').replace(/^---[^\n]*\n/, '')}\nreturn main;})()`);
const original = load('input.js');
const residuals = ['residual.js', 'context.residual.js', 'capture-items.residual.js', 'capture-items.context.residual.js', 'array-loop.residual.js', 'array-loop.context.residual.js', 'array-helper.residual.js', 'array-helper.context.residual.js'];
const atoms = [undefined,null,false,true,0,-1,NaN,Infinity,'','x',[],{},['x'],[1],Array(2)];
const factories = atoms.map(x => () => x);
for (const name of atoms) for (const age of atoms) for (const tags of atoms) factories.push(() => ({name,age,tags}));
factories.push(
 () => Object.create({name:'x',age:1,tags:[]}),
 () => ({name:'x',age:1}),
 () => ({name:'x',age:1,tags:[],extra:1}),
 // Overridden every is checked separately: loop variants intentionally ignore it.
 () => ({name:'x',age:1,tags:['x']})
);
function observe(fn, factory) {
 const trace=[];
 try { return {result:fn(factory(trace)),trace}; }
 catch(e) { return {error:[e.name,e.message],trace}; }
}
for (const key of ['name','age','tags']) {
 factories.push(trace => {
   const obj={name:'x',age:1,tags:['a']};
   let reads=0;
   Object.defineProperty(obj,key,{get(){trace.push([key,++reads]);return key==='name'?'x':key==='age'?1:['a'];}});
   return obj;
 });
 factories.push(trace => new Proxy({name:'x',age:1,tags:['a']},{
   get(o,k,r){trace.push(['get',String(k)]);return Reflect.get(o,k,r);},
   getOwnPropertyDescriptor(o,k){trace.push(['own',String(k)]);return Reflect.getOwnPropertyDescriptor(o,k);}
 }));
}
factories.push(trace => ({get name(){trace.push('throw');throw new TypeError('fixture');},age:0,tags:[]}));
for (const file of residuals) {
 const specialized=load(file);
 for (const factory of factories) assert.deepEqual(observe(specialized,factory),observe(original,factory));
 console.log(`${file}: ${factories.length} results/exceptions/access traces match original`);
 const override = () => ({name:'x',age:1,tags:Object.assign(['x'],{every(){return 'custom';}})});
 assert.equal(specialized(override()), file.startsWith('array-') ? true : original(override()));
}
