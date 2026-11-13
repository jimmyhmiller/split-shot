const assert=require('node:assert/strict');
const e=require('./engine.js');
const examples=[
 ['add-two','λn. λf. λx. f (f (n f x))',n=>n+2],
 ['double','λn. λf. λx. n f (n f x)',n=>2*n],
 ['square','λn. λf. n (n f)',n=>n*n],
 ['identity','λn. n',n=>n],
 ['constant','λn. λf. λx. f x',()=>1],
 ['shadowing','λn. (λn. n) n',n=>n],
 ['capture-sensitive','λn. (λf. λn. f) n',n=>n] // output is a function, checked structurally below
];
let outputs=0, structures=0;
for(const [label,source,oracle] of examples){
 const term=e.parse(source);
 for(const interpreter of ['lambda','twice']){
  let first;
  for(let p=1;p<=3;p++){
   const r=e.project(p,term,interpreter);
   if(p===1) first=r.target;else assert(e.same(first,r.target),`${label} P${p} ${interpreter}`);
   structures++;
   if(label==='capture-sensitive') continue;
   for(let n=0;n<=6;n++){
    const fn=e.runtime().run(r.target);
    const expected=interpreter==='twice'?oracle(oracle(n)):oracle(n);
    assert.equal(e.churchResult(fn,n),expected,`${label} P${p} ${interpreter} ${n}`);
    // Independent execution of the unchanged interpreter, without specialization.
    const original=e.runtime().run(e.interpreters[interpreter])(e.quote(term));
    assert.equal(e.churchResult(original,n),expected);
    outputs+=2;
   }
  }
 }
}
assert.throws(()=>e.parse('λn. missing'),/Unbound/);
assert.throws(()=>e.parse('(λn. n'),/parenthesis/);
assert.throws(()=>e.parse(''),/Expected/);
assert(e.same(e.parse('λa. λb. a b'),e.parse('λx. λy. x y')));
assert(!e.same(e.parse('λa. λb. a'),e.parse('λa. λb. b')));
// Check the five-case kernel itself, including static beta reduction.
const annotated={tag:'app',stage:'S',fn:{tag:'lam',stage:'S',name:'x',body:{tag:'var',name:'x'}},arg:{tag:'lam',stage:'D',name:'z',body:{tag:'var',name:'z'}}};
assert(e.same(e.readback(e.makeMix().mix(e.quote(annotated,true))),e.parse('λz. z')));
console.log(`${structures} projection/structural checks; ${outputs} numerical checks; parser, alpha-equivalence, and static reduction passed.`);
// Execute the actual pure-lambda P source as well as its JS five-rule embedding.
// Erasing annotations of PA yields P; the lambda runtime ignores stage markers.
for(const annotation of [e.EA,e.PA,e.TWICE]) {
 const expected=e.readback(e.makeMix().mix(e.quote(e.PA,true))(e.quote(annotation,true)));
 const actual=e.readback(e.runtime().run(e.PA)(e.quote(e.PA,true))(e.quote(annotation,true)));
 assert(e.same(actual,expected),'pure-lambda P disagrees with host embedding');
}
console.log('Pure-lambda P matches its five-rule JS embedding on all 3 annotated inputs (including itself).');
