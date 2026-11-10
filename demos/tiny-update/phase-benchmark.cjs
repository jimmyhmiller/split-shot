// Attribute the end-to-end benchmark: prepare separately from DOM patching.
// NODE_PATH=/path/to/node_modules node demos/tiny-update/phase-benchmark.cjs
const { performance } = require('node:perf_hooks');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
async function main() {
  const {page,errors}=require('./dom-env.cjs').createPage();
  page.window.eval('codeWorkbench.destroy()');
  const api=page.window.eval('({ original:interpretedProgram, compiled:RelayDesk, collections:createCollections })');
  const results=[];
  const median=xs=>xs.slice().sort((a,b)=>a-b)[Math.floor(xs.length/2)];
  const pause=()=>new Promise(resolve=>setImmediate(resolve));
  let sink=0;
  try {
    for(const size of [240,3840]) for(const workload of ['operator','search']) for(const phase of ['prepare','patch']) {
      const tasks=[api.original,api.compiled].map(program=>{
        const a=program.prepare(program.initial({size}));
        const b=workload==='operator'?{...a,jobs:a.jobs.map(job=>job.id===a.selectedId?{...job,owner:'Quinn'}:job)}:{...a,query:'Northstar'};
        if(phase==='prepare') return {run(count){for(let i=0;i<count;i+=2){sink+=program.prepare(b).view.matched;sink+=program.prepare(a).view.matched;}},close(){}};
        const next=program.prepare(b),root=page.window.document.createElement('div');
        const collections=api.collections(program,page.window.document,()=>{});
        const nodes=program.mount({state:a,document:page.window.document,root,dispatch(){},collections});
        const forward={previous:a,next,nodes,collections},backward={previous:next,next:a,nodes,collections};
        return {run(count){for(let i=0;i<count;i+=2){program.update(forward);program.update(backward);}},close(){root.replaceChildren();}};
      });
      const timed=(task,count)=>{const start=performance.now();task.run(count);return performance.now()-start;};
      try {
        tasks.forEach(task=>task.run(16));
        let count=2;
        while(count<1024&&Math.max(timed(tasks[0],count),timed(tasks[1],count))<25)count*=2;
        const samples=[[],[]];
        for(let sample=0;sample<9;sample++){
          await pause();for(const side of sample%2?[1,0]:[0,1])samples[side].push(timed(tasks[side],count)*1000/count);
        }
        const originalUs=median(samples[0]),compiledUs=median(samples[1]);
        results.push({records:size,workload,phase,originalUs,compiledUs,speedup:originalUs/compiledUs,iterationsPerSample:count,samples:9,originalSamplesUs:samples[0],compiledSamplesUs:samples[1]});
      }finally{tasks.forEach(task=>task.close());}
    }
    assert.deepEqual(errors,[]);
    const report={measuredAt:new Date().toISOString(),environment:`Node ${process.version}, jsdom ${require('jsdom/package.json').version}, ${os.platform()} ${os.arch()}, ${os.cpus()[0].model}`,
      inputHash:createHash('sha256').update(fs.readFileSync(path.join(__dirname,'compiled.js'))).update(fs.readFileSync(__filename)).digest('hex'),
      scope:'Phase isolation: preparation includes scan/sort/view allocation; patch includes keyed reconciliation and DOM calls on pre-prepared snapshots. No layout/paint. End-to-end benchmark includes both and actual events/reducers.',results};
    fs.writeFileSync(path.join(__dirname,'phase-benchmark-results.json'),JSON.stringify(report,null,2)+'\n');
    console.log(report.environment);console.table(results.map(row=>({records:row.records,workload:row.workload,phase:row.phase,'original µs':row.originalUs.toFixed(2),'generated µs':row.compiledUs.toFixed(2),speedup:row.speedup.toFixed(2)+'×'})));
    assert(sink>0);
  }finally{page.window.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
