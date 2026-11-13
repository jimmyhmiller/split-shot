const fs=require('node:fs');
const vm=require('node:vm');
const os=require('node:os');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const files=['input.js','array-loop.input.js','residual.js','array-loop.residual.js'];
const median=xs=>[...xs].sort((a,b)=>a-b)[xs.length>>1];
function worker(){
 const fns=files.map(file=>vm.runInThisContext(`(function(){${fs.readFileSync(path.join(__dirname,file),'utf8').replace(/^---[^\n]*\n/,'')}\nreturn main;})()`));
 const workloads={
  mixed:Array.from({length:256},(_,i)=>i%8===0?null:i%8===1?{name:'',age:i,tags:['x']}:i%8===2?{name:'Person '+i,age:-1,tags:[]}:i%8===3?{name:'Person '+i,age:i,tags:['x',false]}:{name:'Person '+i,age:i,tags:Array.from({length:i%7},(_,j)=>'tag'+j)}),
  'valid-short':Array.from({length:256},(_,i)=>({name:'Person '+i,age:i,tags:Array.from({length:i%7},(_,j)=>'tag'+j)})),
  'valid-long':Array.from({length:256},(_,i)=>({name:'Person '+i,age:i,tags:Array.from({length:32+i%33},(_,j)=>'tag'+j)}))
 };
 // Separate call sites keep each timed loop monomorphic.
 const runners=fns.map(fn=>vm.runInThisContext('(fn => function(inputs, rounds) {let sum=0; for(let r=0;r<rounds;r++) for(let i=0;i<inputs.length;i++) sum+=fn(inputs[i])?1:0; return sum;})')(fn));
 const result={};
 for(const [name,inputs] of Object.entries(workloads)){
  for(const fn of fns) for(const x of inputs) assert.equal(fn(x),fns[0](x));
  const expected=inputs.filter(fns[0]).length;
  function measure(index,rounds){const start=process.hrtime.bigint();const sum=runners[index](inputs,rounds);const ns=Number(process.hrtime.bigint()-start)/(rounds*inputs.length);assert.equal(sum,expected*rounds);return ns;}
  for(let i=0;i<fns.length;i++) measure(i,1000);
  const rounds=Math.max(100,Math.ceil(15e6/(Math.min(...fns.map((_,i)=>measure(i,200)))*inputs.length)));
  const samples=files.map(()=>[]);
  for(let s=0;s<11;s++) for(let j=0;j<files.length;j++){const i=(s+j)%files.length;samples[i].push(measure(i,rounds));}
  result[name]={rounds,medians:samples.map(median),samples};
 }
 return result;
}
if(process.argv.includes('--worker')) process.stdout.write(JSON.stringify(worker()));
else {
 const processes=Array.from({length:3},()=>JSON.parse(execFileSync(process.execPath,[__filename,'--worker'],{encoding:'utf8'})));
 const summary=Object.keys(processes[0]).map(workload=>{const ns=files.map((_,i)=>median(processes.map(p=>p[workload].medians[i])));return {workload,...Object.fromEntries(files.map((f,i)=>[f,Number(ns[i].toFixed(1))])),loopResidualSpeedup:Number(median(processes.map(p=>p[workload].medians[2]/p[workload].medians[3])).toFixed(2)),loopSourceSpeedup:Number(median(processes.map(p=>p[workload].medians[0]/p[workload].medians[1])).toFixed(2))};});
 const report={date:new Date().toISOString(),node:process.version,cpu:os.cpus()[0].model,platform:process.platform,files:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(fs.readFileSync(path.join(__dirname,f))).digest('hex')])),summary,processes};
 fs.writeFileSync(path.join(__dirname,'benchmark-results.json'),JSON.stringify(report,null,2)+'\n');
 console.table(summary);
}
