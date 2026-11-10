// Independent oracle: original upstream runRichards body and its original check.
// Nonstandard COUNT intentionally fails the fixed oracle AFTER schedule finishes;
// retain the constructed Scheduler and read its actual counters, without changing
// any scheduler/task algorithm or replacing the original validation clause.
'use strict';
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const here = __dirname;
const counts = JSON.parse(process.argv[2] || '[1,2,10,100,1000,2500,10000,37,999,4093,12345]');
const upstream = fs.readFileSync(path.join(here, 'upstream-richards.js'), 'utf8');
const body = upstream.slice(upstream.indexOf('var Richards ='), upstream.lastIndexOf('var success = true;'));
const c = vm.createContext({});
vm.runInContext('function Benchmark(){} function BenchmarkSuite(){}\n' + body, c);
vm.runInContext(`
var lastScheduler;
const OriginalScheduler = Scheduler;
Scheduler = new Proxy(OriginalScheduler, {construct(target,args,newTarget) {
  lastScheduler = Reflect.construct(target,args,newTarget); return lastScheduler;
}});
`, c);
const runtimeCount = counts.map(input => {
  c.COUNT = input;
  let validation = 'passed';
  try { c.runRichards(); }
  catch (error) {
    if (!String(error.message).startsWith('Error during execution: queueCount = ')) throw error;
    if (input === 1000) throw error;
    validation = 'original fixed-size oracle rejected nonstandard COUNT, as expected';
  }
  return {input, value: [c.lastScheduler.queueCount, c.lastScheduler.holdCount], validation};
});
const adapted = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(here, 'runtime-count.input.js'), 'utf8'), adapted);
for (const row of runtimeCount) {
  if (JSON.stringify(adapted.main(row.input)) !== JSON.stringify(row.value)) throw Error('COUNT oracle mismatch: ' + row.input);
}
const rejected = [0,-1,1.5,NaN,Infinity,-Infinity,1000001,'1000',null,undefined].map(input => {
  try { adapted.main(input); throw Error('not rejected: ' + String(input)); }
  catch (e) { if(e.name !== 'Error') throw e; return {input:String(input), type:typeof input, error:e.name}; }
});
adapted.EXPECTED_QUEUE_COUNT = -1;
let validationPreserved = false;
try { adapted.main(1000); } catch(e) { validationPreserved = String(e.message).startsWith('Error during execution:'); }
if (!validationPreserved) throw Error('original COUNT=1000 validation removed');
const exact = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(here, 'input.js'), 'utf8'), exact);
const originalAdapter = [0,1,2,3].map(input => ({input, value:exact.main(input)}));
if (!originalAdapter.every(row => row.value === true)) throw Error('original adapter mismatch');
// Allocation instrumentation is one untimed, standard-size original invocation.
const a = vm.createContext({});
vm.runInContext('function Benchmark(){} function BenchmarkSuite(){}\n' + body, a);
vm.runInContext(`
var allocationSites={}, methodRuns={}, scheduleActive=false, allocationsDuringSchedule=0;
var allocationsBeforeSchedule=null, observedScheduler=null;
for (const name of ['Scheduler','Packet','TaskControlBlock','IdleTask','WorkerTask','HandlerTask','DeviceTask','Array']) {
  const original=globalThis[name];
  globalThis[name]=new Proxy(original,{construct(target,args,newTarget) {
    allocationSites[name]=(allocationSites[name]||0)+1;
    if(scheduleActive) allocationsDuringSchedule++;
    const obj=Reflect.construct(target,args,newTarget);
    if(name==='Scheduler') observedScheduler=obj;
    return obj;
  }});
}
for (const name of ['TaskControlBlock','IdleTask','WorkerTask','HandlerTask','DeviceTask']) {
  const original=globalThis[name].prototype.run;
  globalThis[name].prototype.run=function(...args) {
    methodRuns[name]=(methodRuns[name]||0)+1;
    return original.apply(this,args);
  };
}
const originalSchedule=Scheduler.prototype.schedule;
Scheduler.prototype.schedule=function() {
  allocationsBeforeSchedule=Object.values(allocationSites).reduce((a,b)=>a+b,0);
  scheduleActive=true;
  try { return originalSchedule.call(this); } finally { scheduleActive=false; }
};
runRichards();
`, a);
const allocationAudit = {
  input:1000,
  scope:'Explicit guest new calls to Scheduler, Packet, TaskControlBlock, task constructors, and Array. Excludes source initialization, function/prototype infrastructure, instrumentation, and adapter result-array literal.',
  allocationSites:a.allocationSites,
  allocationsBeforeSchedule:a.allocationsBeforeSchedule,
  allocationsDuringSchedule:a.allocationsDuringSchedule,
  methodRuns:a.methodRuns,
  queueCount:a.observedScheduler.queueCount,
  holdCount:a.observedScheduler.holdCount,
};
if (allocationAudit.allocationsBeforeSchedule !== 30 || allocationAudit.allocationsDuringSchedule !== 0) throw Error('allocation audit changed');
if (allocationAudit.methodRuns.TaskControlBlock !== 6573) throw Error('dispatch count changed');
console.log(JSON.stringify({runtimeCount, originalAdapter, rejectedInputs:rejected, standardValidationPreserved:validationPreserved, allocationAudit}, null, 2));
