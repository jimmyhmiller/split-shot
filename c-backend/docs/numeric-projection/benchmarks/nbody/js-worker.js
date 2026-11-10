// Runs one source in ordinary Node globals; process startup and compilation are excluded.
const fs = require('node:fs');
const source = fs.readFileSync(process.argv[2], 'utf8');
const mode = process.argv[3];
const inputs = JSON.parse(process.argv[4]);
const main = new Function('allocF64', 'f64Sqrt', 'failCapacity', 'loadF64', 'storeF64', source + '\nreturn main;')(
  n => new Float64Array(n), Math.sqrt, () => { throw Error('numeric capacity exceeded'); },
  (a,i) => a[i], (a,i,v) => (a[i]=v));
function bits(x) { const b = Buffer.alloc(8); b.writeDoubleBE(x); return b.toString('hex'); }
if (mode === 'check') console.log(JSON.stringify(inputs.map(n => ({input:n, bits:bits(main(n))}))));
else {
  const n=inputs, samples=7, warmup=5;
  let expected=bits(main(n));
  function run(batch) { const start=performance.now(); for(let i=0;i<batch;i++) if(bits(main(n))!==expected) throw Error('timed mismatch'); return (performance.now()-start)/batch/1000; }
  for(let i=0;i<warmup;i++) run(1);
  const pilot=run(1), batch=Math.max(1,Math.min(100,Math.ceil(0.03/Math.max(pilot,0.000001))));
  const times=Array.from({length:samples},()=>run(batch));
  console.log(JSON.stringify({input:n,bits:expected,warmup_calls:warmup,samples_seconds:times,batch,median_seconds:[...times].sort((a,b)=>a-b)[3]}));
}
