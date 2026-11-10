const assert = require('node:assert/strict');
const vm = require('node:vm');

function dom() {
  const trace = [], ids = new Map();
  let serial = 0;
  function create(tag, text) {
    const id = serial++, attrs = {}, listeners = {}, props = { value: '', checked: false, disabled: false, hidden: false, selected: false };
    let nodeValue = text;
    const node = { id, tag, attrs, props, children: [], parentNode: null,
      appendChild(child) { assert.equal(child.parentNode, null); this.children.push(child); child.parentNode = this; trace.push(['append',id,child.id]); },
      removeChild(child) { assert.equal(child.parentNode,this); this.children.splice(this.children.indexOf(child),1); child.parentNode=null; trace.push(['remove',id,child.id]); },
      setAttribute(key,value) { attrs[key]=String(value); if(key==='data-ui') ids.set(String(value),this); trace.push(['attr',id,key,String(value)]); },
      insertBefore(child,reference) {
        if(child===reference) return child;
        if(child.parentNode) { const old=child.parentNode; old.children.splice(old.children.indexOf(child),1); }
        const index=reference===null?this.children.length:this.children.indexOf(reference);
        assert(index>=0); this.children.splice(index,0,child); child.parentNode=this;
        trace.push(['move',id,child.id,reference?reference.id:null]); return child;
      },
      get firstChild() { return this.children[0] || null; },
      get nextSibling() { if(!this.parentNode)return null; const siblings=this.parentNode.children; return siblings[siblings.indexOf(this)+1] || null; },
      getAttribute(key) { return attrs[key] ?? null; },
      addEventListener(type,listener) { (listeners[type] ||= []).push(listener); trace.push(['listen',id,type]); },
      fire(type) { if(type==='click' && this.disabled) return; for(const listener of listeners[type] || []) listener({target:this,currentTarget:this}); },
      get nodeValue() { return nodeValue; },
      set nodeValue(value) { nodeValue=String(value); trace.push(['text',id,String(value)]); }
    };
    for(const key of Object.keys(props)) Object.defineProperty(node,key,{get(){return props[key];},set(value){ props[key]=key==='value'?String(value):!!value; trace.push(['property',id,key,props[key]]); }});
    trace.push(['create',id,tag,text]); return node;
  }
  const document={createElement:tag=>create(tag,null),createTextNode:text=>create(null,String(text))};
  const root=create('host',null);
  function snapshot(node=root) { return {tag:node.tag,attrs:{...node.attrs},props:{...node.props},text:node.nodeValue,children:node.children.map(snapshot)}; }
  function text(node) { return node.tag===null?node.nodeValue:node.children.map(text).join(''); }
  return {document,root,trace,snapshot,text,find:id=>ids.get(id)};
}
const plain = value => JSON.parse(JSON.stringify(value));
function verify({ original, compiled, controller, bundle }) {
  const start=vm.runInNewContext(controller+'\nstart');
  const standalone=vm.runInNewContext(bundle+'\nRelayDesk');
  let transitions=0, mounts=0;
  for(const size of [1,24,240,960,3840]) {
    const rawA=original.initial({size}), rawB=compiled.initial({size});
    assert.deepEqual(plain(rawB),plain(rawA),'initial data');
    const a=dom(),b=dom();
    const left=start(original,a.document,a.root,null,{size});
    const right=standalone.start(b.document,b.root,null,{size});
    assert.deepEqual(b.trace,a.trace,'mount trace');
    assert.deepEqual(b.snapshot(),a.snapshot(),'mounted DOM'); mounts++;
    const nodes=b.root.children.slice();
    function check(id,type,value,property='value') {
      const previousRows=new Map(b.find('queue-rows').children.map(node=>[node.attrs['data-record'],node]));
      if(value!==undefined) { a.find(id)[property]=value;b.find(id)[property]=value; }
      a.trace.length=b.trace.length=0;
      a.find(id).fire(type); b.find(id).fire(type);
      assert.deepEqual(plain(right.getState()),plain(left.getState()),'state after '+id);
      assert.deepEqual(b.trace,a.trace,'effects after '+id);
      assert.deepEqual(b.snapshot(),a.snapshot(),'DOM after '+id);
      for(const node of b.find('queue-rows').children) if(previousRows.has(node.attrs['data-record'])) assert.equal(node,previousRows.get(node.attrs['data-record']),'keyed row identity');
      assert.deepEqual(b.root.children,nodes,'root identity');
      const state=right.getState();
      assert(state.page>=0 && state.page<state.view.pages,'page bounds');
      assert.equal(state.view.open+state.view.done,size);
      assert.equal(b.text(b.find('open-value')),String(state.jobs.filter(job=>job.status!==2).length));
      assert.equal(b.text(b.find('detail-name')),state.view.focus.customer);
      assert.equal(b.find('owner').value,state.view.focus.owner);
      assert.deepEqual(b.find('queue-rows').children.map(node=>+node.attrs['data-record']),plain(state.view.rows.map(job=>job.id)),'visible row order');
      transitions++;
    }
    check('noop','click'); assert.deepEqual(b.trace,[],'no-op writes');
    check('search','input','NO_SUCH_CONSIGNMENT');
    assert.equal(right.getState().view.matched,0);
    assert.equal(b.find('queue-rows').children.length,0);
    check('search','input','Northstar'); assert(right.getState().view.rows.every(job=>job.customer==='Northstar Labs'));
    check('search','input','');
    check('sort','change','customer');
    check('job-'+right.getState().view.rows[0].id+'-open','click');
    check('owner','input','Quinn'); assert.equal(right.getState().view.focus.owner,'Quinn');
    check('priority','click'); check('job-'+right.getState().view.rows[0].id+'-check','change',true,'checked');
    check('select-page','click'); assert.equal(right.getState().view.selected,Math.min(24,size));
    check('bulk-dispatch','click'); assert.equal(right.getState().view.selected,0);
    check('advance','click'); assert.equal(right.getState().tick,1);
    check('pause','click'); check('advance','click'); assert.equal(right.getState().tick,1);
    check('pause','click'); check('advance','click'); assert.equal(right.getState().tick,2);
    check('filter','change','transit'); assert(right.getState().view.rows.every(job=>job.status===1));
    check('next','click'); check('previous','click');
    check('deliver','click'); check('filter','change','done');
    check('sort','change','progress'); check('clear-selection','click');
    // Deterministic longer stream stresses repeated stable slots, filtered
    // windows, state-derived text/classes/styles, checkboxes, and bulk actions.
    for(let step=0;step<18;step++) {
      check('filter','change',['all','queued','transit','done'][step%4]);
      check('advance','click');
      if(step%3===0) check('next','click');
    }
    check('reset','click'); assert.equal(right.getState().jobs.length,size);
    assert.equal(right.getState().query,''); assert.equal(right.getState().tick,0);
    const stale=b.find('advance'),tick=right.getState().tick;
    const unrelated=b.document.createElement('unrelated');b.root.appendChild(unrelated);
    right.dispose();right.dispose();assert.deepEqual(b.root.children,[unrelated]);
    stale.fire('click');assert.equal(right.getState().tick,tick);
    left.dispose();assert.equal(a.root.children.length,0);
  }
  // DOM failure propagation remains an observable part of specialization.
  for(const program of [original,compiled]) {
    const marker=new Error('DOM failed'),state=program.prepare(program.initial({size:24}));
    assert.throws(()=>program.mount({state,document:{createElement(){throw marker;}},root:{},dispatch(){}}),error=>error===marker);
  }
  return `Verified ${mounts} complete dashboard mounts (1–3,840 records), ${transitions} sequential DOM/state transitions, filters/sorts/empty results/pagination, bulk actions, live inputs, simulation, node identity, and disposal.`;
}
module.exports={verify};
