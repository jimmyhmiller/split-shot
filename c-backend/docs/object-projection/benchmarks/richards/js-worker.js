// One ordinary Node process per round. Loading/compilation is outside timing.
'use strict';
const fs = require('node:fs'), path = require('node:path');
const source = fs.readFileSync(process.argv[2], 'utf8');
const family = process.argv[3], mode = process.argv[4], input = JSON.parse(process.argv[5]);
const samples = +(process.argv[6] || 7), warmup = +(process.argv[7] || 5);
const original = family === 'original' || family === 'original_fresh';
const runtime = original ? {} : require(path.join(__dirname, '../../intrinsics.js'));
// Residual function identities are generic frontend metadata, not Richards logic.
const guestNames = [...source.matchAll(/function\s+(guest_(\d+))\s*\(/g)];
const guestEntries = guestNames.map(match => JSON.stringify(match[2])+':'+match[1]).join(',');
const factory = new Function(...Object.keys(runtime), source + '\nreturn {main,guests:{'+guestEntries+'}};');
const program = family === 'original_fresh' ? null : factory(...Object.values(runtime));
const main = program && program.main;
function unbox(v) {
  if (original) return v;
  switch(v.tag) {
    case 0:return undefined; case 1:return null;
    case 2:case 3:case 5:return v.payload;
    case 4:if(v.payload.kind===1)return Array.from(v.payload.elements,unbox);
  }
  throw Error('unsupported returned value');
}
function invoke(n) {
  if(family === 'original_fresh') return factory().main(n);
  if(runtime.resetObjectRuntime) runtime.resetObjectRuntime();
  if(guestNames.length) {
    if(!runtime.setGuestDispatcher) throw Error('reference runtime has no guest dispatcher');
    runtime.setGuestDispatcher(code => {
      const fn=program.guests[code];
      if(!fn) throw Error('unknown residual guest function: '+code);
      return fn(0);
    });
  }
  return unbox(main(n));
}
function consume(value) {
  if(value === true) return 1;
  if(Array.isArray(value) && value.length===2 && value.every(Number.isInteger)) return value[0]*1000003 + value[1];
  throw Error('unexpected result: ' + JSON.stringify(value));
}
if(mode==='check') {
  console.log(JSON.stringify(input.map(n => { const value=invoke(n); consume(value); return {input:n,value}; })));
} else if(mode==='reject') {
  const n = input === 'NaN' ? NaN : input === 'Infinity' ? Infinity : input === '-Infinity' ? -Infinity : input;
  try { const value=invoke(n); console.log(JSON.stringify({accepted:true,value})); }
  catch(e) {
    const error=e && e.tag===4 ? unbox(runtime.objGet(e,3)) : e.name;
    const message=e && e.tag===4 ? unbox(runtime.objGet(e,4)) : e.message;
    console.log(JSON.stringify({accepted:false,error,message}));
  }
} else if(mode==='time') {
  const value=invoke(input), expected=consume(value);
  let sink=0;
  function run(batch) {
    const start=performance.now();
    for(let i=0;i<batch;i++) { const got=consume(invoke(input)); if(got!==expected) throw Error('timed output mismatch'); sink+=got; }
    return (performance.now()-start)/batch/1000;
  }
  for(let i=0;i<warmup;i++) run(1);
  const pilot=run(1), batch=Math.max(1,Math.min(1000,Math.ceil(0.03/Math.max(pilot,0.000001))));
  const times=Array.from({length:samples},()=>run(batch));
  console.log(JSON.stringify({input,value,warmup_calls:warmup,pilot_calls:1,batch,samples_seconds:times,median_seconds:[...times].sort((a,b)=>a-b)[Math.floor(samples/2)],consumed_checksum:sink}));
} else throw Error('unknown mode');
