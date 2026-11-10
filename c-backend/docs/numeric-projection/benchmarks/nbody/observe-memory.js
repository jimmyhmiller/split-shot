// Deliberately separate, instrumented run: never used for performance measurements.
const fs=require('node:fs');
const source=fs.readFileSync(process.argv[2],'utf8');
const inputs=JSON.parse(process.argv[3]);
let buffers=[], heapHigh=0, stackHigh=0;
const main=new Function('allocF64','f64Sqrt','failCapacity','loadF64','storeF64', source+'\nreturn main;')(
  n=>{const a=new Float64Array(n);buffers.push(a);return a;},
  Math.sqrt,()=>{throw Error('numeric capacity exceeded');},(a,i)=>a[i],
  (a,i,v)=>{if(a===buffers[2]){if(i===0)heapHigh=Math.max(heapHigh,v);if(i===1)stackHigh=Math.max(stackHigh,v);}return a[i]=v;});
console.log(JSON.stringify(inputs.map(n=>{
  buffers=[];heapHigh=0;stackHigh=0;
  const value=main(n), b=Buffer.alloc(8);b.writeDoubleBE(value);
  if(buffers.length!==3 || buffers[2].length!==4)throw Error('unexpected allocation layout');
  return {input:n,bits:b.toString('hex'),allocations:buffers.length,buffer_lengths:buffers.map(b=>b.length),total_payload_bytes:buffers.reduce((n,b)=>n+b.byteLength,0),heap_high_water:heapHigh,stack_high_water:stackHigh};
}),null,2));
