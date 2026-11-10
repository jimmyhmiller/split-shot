// Generic demo instrumentation. No application markup, reducers, or handlers.
function show(id, launch) {
  const root = document.getElementById(id), log = document.getElementById(id + '-trace');
  let propertyWrites = [];
  const observer = new MutationObserver(function () {});
  observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true });
  const dom = {
    createTextNode: function (text) { return document.createTextNode(text); },
    createElement: function (tag) {
      const node = document.createElement(tag);
      for (const key of ['value', 'checked', 'disabled', 'hidden', 'selected']) {
        let proto = node, descriptor;
        while (proto && !descriptor) { descriptor = Object.getOwnPropertyDescriptor(proto,key); proto = Object.getPrototypeOf(proto); }
        if (!descriptor || !descriptor.get || !descriptor.set) continue;
        Object.defineProperty(node,key,{ configurable:true,
          get:function(){return descriptor.get.call(this);},
          set:function(value){descriptor.set.call(this,value);propertyWrites.push('property '+node.getAttribute('data-ui')+'.'+key+' ← '+JSON.stringify(value));}
        });
      }
      return node;
    }
  };
  function report(event) {
    const changes = observer.takeRecords().map(function (record) {
      const target=record.target;
      const name=target.nodeType===3 ? target.parentNode.getAttribute('data-ui') : target.getAttribute('data-ui');
      if(record.type==='characterData') return 'text '+name+' ← '+JSON.stringify(target.nodeValue);
      if(record.type==='attributes') return 'attribute '+name+'.'+record.attributeName;
      return 'tree '+name+' · +'+record.addedNodes.length+' / −'+record.removedNodes.length;
    });
    changes.push.apply(changes,propertyWrites);propertyWrites=[];
    if(event.phase==='mount') log.textContent='Mounted by program · '+root.querySelectorAll('*').length+' elements · '+event.state.jobs.length+' records';
    else log.textContent=changes.length ? changes.length+' DOM mutations\n'+changes.slice(0,8).join('\n')+(changes.length>8?'\n… '+(changes.length-8)+' more mutations':'') : '0 DOM mutations';
  }
  return launch(root, report, dom);
}
show('original',function(root,observe,dom){return start(interpretedProgram,dom,root,observe);});
show('compiled',function(root,observe,dom){return RelayDesk.start(dom,root,observe);});

document.getElementById('run-benchmark').onclick=async function(){
  const button=this,status=document.getElementById('benchmark-status'),body=document.getElementById('benchmark-results');
  button.disabled=true;body.replaceChildren();
  try {
    const rows=await benchmarkUI({document:document,original:interpretedProgram,compiled:RelayDesk,
      now:function(){return performance.now();},
      pause:function(){return new Promise(function(resolve){setTimeout(resolve,0);});},
      progress:function(name){status.textContent='Measuring '+name+'…';}
    });
    rows.forEach(function(row){
      const tr=document.createElement('tr');
      [row.scenario,row.records.toLocaleString(),row.originalUs.toFixed(2)+' µs',row.compiledUs.toFixed(2)+' µs',row.speedup.toFixed(2)+'×',row.iterationsPerSample.toLocaleString()].forEach(function(value){const td=document.createElement('td');td.textContent=value;tr.appendChild(td);});
      body.appendChild(tr);
    });
    status.textContent='Complete · this browser · median of '+rows[0].samples+' samples · includes data preparation and keyed reconciliation · ratios below 1× mean slower.';
  }catch(error){status.textContent='Benchmark failed: '+error.message;}
  finally{button.disabled=false;}
};
