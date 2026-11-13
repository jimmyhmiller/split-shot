const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,2);
assert(!html.includes('/*ENGINE*/'));
const workerSource=scripts.find(s=>s[1].includes('worker-source'))[2];
const uiSource=scripts.find(s=>!s[1].includes('worker-source'))[2];
new vm.Script(uiSource,{filename:'page-ui.js'});
new vm.Script(workerSource,{filename:'page-worker.js'});
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,'duplicate HTML id');
for(const match of uiSource.matchAll(/\$\('([^']+)'\)/g)) assert(ids.includes(match[1]),`missing element ${match[1]}`);
let message;
const context=vm.createContext({self:{postMessage:m=>{message=m;}},performance});
vm.runInContext(workerSource,context);
// Worker-global self and globalThis are the same object in an actual browser.
context.self.Mogensen=context.Mogensen;
let checks=0;
for(const interpreter of ['lambda','twice']) for(const projection of [1,2,3]) {
 message=null;
 context.self.onmessage({data:{projection,source:'λn. λf. λx. f (f (n f x))',input:3,interpreter}});
 assert(message.ok,JSON.stringify(message));
 assert.equal(message.value,interpreter==='lambda'?5:7);
 assert.equal(message.stages.length,projection);
 assert(message.implementation.includes('Pᵃ'));
 checks++;
}
for(const [source,input] of [['λn. missing',3],['(',3],['λn. n',-1],['λn. n',0.5]]) {
 context.self.onmessage({data:{projection:3,source,input,interpreter:'lambda'}});
 assert.equal(message.ok,false);checks++;
}
console.log(`Standalone page: both scripts parse, DOM IDs resolve, ${checks} embedded-worker success/error checks pass.`);
