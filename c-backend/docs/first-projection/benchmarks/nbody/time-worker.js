// Invoked by run.js in a timeout-bounded child. Ordinary Node globals avoid
// vm-context proxy costs (especially Math lookups) contaminating the benchmark.
const fs=require('node:fs');
const source=fs.readFileSync(process.argv[2],'utf8');
const expected=JSON.parse(process.argv[3]);
const main=new Function(source+'\nreturn main;')();
const input=10000, warmup=5, samples=7;
function run(batch){const start=performance.now();for(let i=0;i<batch;i++){if(!Object.is(main(input),expected))throw Error('timed output mismatch');}return performance.now()-start;}
for(let i=0;i<warmup;i++)run(1);
const pilot=run(1),batch=Math.min(100,Math.max(1,Math.ceil(30/Math.max(pilot,0.001))));
const times=Array.from({length:samples},()=>run(batch)/batch);
console.log(JSON.stringify({batch,warmup,samples,msPerCall:times,medianMs:[...times].sort((a,b)=>a-b)[Math.floor(samples/2)],minMs:Math.min(...times),maxMs:Math.max(...times)}));
