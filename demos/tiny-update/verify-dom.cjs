// NODE_PATH=/path/to/node_modules node demos/tiny-update/verify-dom.cjs
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { page, errors } = require('./dom-env.cjs').createPage();
const {document,Event}=page.window;
const editorApi=page.window.eval('({ codeFiles, codeWorkbench })');
assert.equal(document.querySelectorAll('.cm-editor').length,2);
assert.equal(document.querySelectorAll('.file-entry').length,editorApi.codeFiles.length);
for(const file of editorApi.codeFiles) {
  assert.equal(file.text,fs.readFileSync(path.join(__dirname,file.name),'utf8'),'source '+file.name);
  editorApi.codeWorkbench.open(file.name,0);
  assert.equal(editorApi.codeWorkbench.views[0].state.doc.toString(),file.text,'editor '+file.name);
  assert.equal(editorApi.codeWorkbench.views[0].state.readOnly,true);
}
editorApi.codeWorkbench.open('app.js',0);
editorApi.codeWorkbench.open('compiled-update.js',1);
editorApi.codeWorkbench.choosePane(1);
document.querySelector('[data-file="compiled-rowUpdate.js"]').click();
assert.equal(editorApi.codeWorkbench.views[1].state.doc.toString(),fs.readFileSync(path.join(__dirname,'compiled-rowUpdate.js'),'utf8'));
assert.equal(editorApi.codeWorkbench.views[0].state.doc.toString(),fs.readFileSync(path.join(__dirname,'app.js'),'utf8'));
assert(document.querySelectorAll('.file-tab').length>2,'file tabs');
editorApi.codeWorkbench.views[0].scrollDOM.scrollTop=120;
editorApi.codeWorkbench.views[1].scrollDOM.scrollTop=240;
editorApi.codeWorkbench.open('runtime.js',0);
editorApi.codeWorkbench.open('app.js',0);
assert.equal(editorApi.codeWorkbench.views[0].scrollDOM.scrollTop,120,'per-file scroll restoration');
assert.equal(editorApi.codeWorkbench.views[1].scrollDOM.scrollTop,240,'independent pane scrolling');
function setNative(node,key,value) {
  let proto=Object.getPrototypeOf(node),descriptor;
  while(proto&&!descriptor){descriptor=Object.getOwnPropertyDescriptor(proto,key);proto=Object.getPrototypeOf(proto);}
  descriptor.set.call(node,value);
}
for(const panel of ['original','compiled']) {
  const root=document.getElementById(panel),find=id=>root.querySelector('[data-ui="'+id+'"]');
  const rows=()=>[...find('queue-rows').children];
  function change(id,value,type='change'){const input=find(id);setNative(input,'value',value);input.dispatchEvent(new Event(type,{bubbles:true}));}
  assert.equal(rows().length,24);
  const first=rows()[0],firstKey=first.getAttribute('data-record');
  find('noop').click();assert.equal(document.getElementById(panel+'-trace').textContent,'0 DOM mutations');
  change('sort','customer');
  const same=rows().find(row=>row.getAttribute('data-record')===firstKey);
  if(same)assert.equal(same,first,'keyed sorting identity');
  change('search','not-a-customer','input');assert.equal(rows().length,0);
  assert(find('empty').textContent.includes('No consignments'));
  change('search','Northstar','input');assert(rows().every(row=>row.textContent.includes('Northstar Labs')));
  change('search','','input');
  const id=rows()[0].getAttribute('data-record');find('job-'+id+'-open').click();
  change('owner','Quinn','input');assert.equal(find('owner').value,'Quinn');
  find('select-page').click();
  assert.equal(root.querySelectorAll('input[type=checkbox]:checked').length,24);
  find('bulk-dispatch').click();
  assert.equal(root.querySelectorAll('input[type=checkbox]:checked').length,0);
  find('advance').click();assert.equal(find('tick').textContent,'TICK 1');
  find('pause').click();assert.equal(find('advance').disabled,true);
  find('advance').click();assert.equal(find('tick').textContent,'TICK 1');
  find('pause').click();find('advance').click();assert.equal(find('tick').textContent,'TICK 2');
  change('filter','done');assert(rows().every(row=>row.textContent.includes('Delivered')));
  change('filter','all');find('next').click();assert(find('pagination').textContent.includes('Page 2'));
  find('previous').click();assert(find('pagination').textContent.includes('Page 1'));
  change('dataset','960');assert(find('subtitle').textContent.includes('960'));
  change('dataset','3840');assert(find('subtitle').textContent.includes('3840'));
  find('reset').click();assert.equal(find('tick').textContent,'TICK 0');assert.equal(find('search').value,'');
}
assert.deepEqual(errors,[]);
const standalone=new JSDOM('<div id="root"></div>',{runScripts:'dangerously'});
standalone.window.eval(fs.readFileSync(path.join(__dirname,'compiled.js'),'utf8')+'\nwindow.instance=RelayDesk.start(document,document.getElementById("root"),null,{size:960});');
assert.equal(standalone.window.instance.getState().jobs.length,960);
standalone.window.document.querySelector('[data-ui="advance"]').click();
assert.equal(standalone.window.instance.getState().tick,1);
standalone.window.instance.dispose();assert.equal(standalone.window.document.getElementById('root').children.length,0);
const runBenchmark=page.window.benchmarkUI;
page.window.benchmarkUI=function(options){return runBenchmark({...options,samples:3,targetMs:1,sizes:[24]});};
async function finish(){
  const button=document.getElementById('run-benchmark');await button.onclick();
  assert.equal(button.disabled,false);assert(document.getElementById('benchmark-status').textContent.startsWith('Complete'));
  assert.equal(document.querySelectorAll('#benchmark-results tr').length,5);
  for(const row of document.querySelectorAll('#benchmark-results tr')){
    assert.equal(row.children.length,6);assert(Number.parseFloat(row.children[2].textContent)>0);assert(Number.parseFloat(row.children[3].textContent)>0);
  }
  assert.deepEqual(errors,[]);editorApi.codeWorkbench.destroy();page.window.close();standalone.window.close();
  process.stdout.write('DOM integration passed: complete dashboard controls, 3 dataset sizes, keyed filtering/sorting, bulk actions, live simulation, CodeMirror file explorer/tabs and exact file contents, standalone bundle, and benchmark UI.\n');
}
finish().catch(error=>{page.window.close();standalone.window.close();process.stderr.write(error.stack+'\n');process.exitCode=1;});
