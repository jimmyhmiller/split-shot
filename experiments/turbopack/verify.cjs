// Differential checks of chunk registration and selected dependency-free factories.
// This is not browser hydration or an end-to-end Next.js test.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const dir = __dirname, rows = JSON.parse(fs.readFileSync(path.join(dir,'results.json')));
function shape(value, seen = new Set()) {
  if (typeof value === 'function') return '<function>';
  if (value === undefined) return '<undefined>';
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return '<cycle>';
  seen.add(value);
  const out = Array.isArray(value) ? Array.from(value,x=>shape(x,seen)) : Object.fromEntries(Object.keys(value).sort().map(k=>[k,shape(value[k],seen)]));
  seen.delete(value); return out;
}
function context(browser) {
 const c = {Error: function QuietError(){this.stack=undefined;}};
 c.self=c; c.window=c;
 if(browser) c.document={currentScript:{src:'https://example.test/chunk.js'},getElementsByTagName(){return []}};
 return vm.createContext(c);
}
function registration(code,browser) {
 const c=context(browser); let error;
 try {vm.runInContext(code,c,{timeout:3000});} catch(e){error={name:e.name,message:e.message};}
 const queues = Object.fromEntries(Object.keys(c).filter(k=>k==='TURBOPACK'||k.startsWith('webpackChunk')||k==='_debugIds').map(k=>[k,shape(c[k])]));
 return {error,queues,main: error?null:shape(c.main(17))};
}
const checks=[];
for(const row of rows) {
 if(row.verdict!=='emitted') continue;
 const stem=row.file.slice(0,-3)+'-'+row.mode;
 const original=fs.readFileSync(path.join(dir,stem+'.input.js'),'utf8'), residual=fs.readFileSync(path.join(dir,stem+'.residual.js'),'utf8');
 try {
  new vm.Script(residual);
  if(row.mode==='ambient') {
   const observations=[];
   for(const browser of [false,true]) {
    const a=registration(original,browser),b=registration(residual,browser);
    assert.deepEqual(b,a); observations.push({browser,error:a.error||null});
   }
   checks.push({file:row.file,mode:row.mode,verdict:'pass',scope:'registration shape and entry identity',observations});
  } else {
   const a=context(false),b=context(false);vm.runInContext(original,a);vm.runInContext(residual,b);
   const inputs=row.mode.startsWith('status')?[401,403,404,200,500,0,null,'404']:[null,0,1,false,'hello',{}, {x:1},{__esModule:true,x:1},{__esModule:false,default:7}];
   for(let round=0;round<2;round++) for(const input of inputs) assert.deepEqual(shape(b.main(input)),shape(a.main(input)));
   checks.push({file:row.file,mode:row.mode,verdict:'pass',calls:inputs.length*2,scope:'returned values on repeated calls'});
  }
 } catch(e) {checks.push({file:row.file,mode:row.mode,verdict:'FAIL',error:e.message});}
}
fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(checks,null,2));console.log(JSON.stringify(checks,null,2));
if(checks.some(x=>x.verdict==='FAIL')) process.exitCode=1;
