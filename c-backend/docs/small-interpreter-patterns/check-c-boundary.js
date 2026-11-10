'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const [source,residual,family]=process.argv.slice(2);
const host={f64Sqrt:Math.sqrt,allocF64:n=>new Float64Array(n)};
const original=vm.runInNewContext(fs.readFileSync(source,'utf8')+'\nentry;',host);
const projected=vm.runInNewContext(fs.readFileSync(residual,'utf8')+'\nentry;',host);
const inputs=[-3,-1,-1.5,-0,0,1,2,3,4,10,2.5,NaN,...(['call','sum'].includes(family)?[]:[Infinity,-Infinity])];
function oracle(x){if(family==='static')return x*2+3;if(family==='primitive'||family==='cache')return x*2;if(family==='call'||family==='sum'){let s=0;for(let i=0;i<x;i++)s+=family==='sum'?i:i+i;return s;}const k=x%3;return(k===0?x:k===1?2:k===2?3:0)+7;}
const number=x=>Object.is(x,-0)?'-0':String(x);
for(const input of inputs){assert.ok(Object.is(original(input),oracle(input)),`original ${input}`);assert.ok(Object.is(projected(input),oracle(input)),`residual ${input}`);}
console.log(JSON.stringify({input_checks:inputs.length,comparisons:inputs.length*2,values:inputs.map(input=>({input:number(input),value:number(oracle(input))}))}));
