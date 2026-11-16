const assert = require('node:assert/strict');
const vm = require('node:vm');
const acorn = require('acorn');
const {cleanBindings} = require('./bindings.cjs');
let comparisons = 0;
function run(source, args) {
  try { return {value: structuredClone(vm.runInNewContext(source+'\nmain(...args)', {args:structuredClone(args)}, {timeout:1000}))}; }
  catch(error) { return {error:error.name+': '+error.message}; }
}
function equivalent(source, cases) {
  const result=cleanBindings(source);
  for(const args of cases) {assert.deepEqual(run(result.code,args),run(source,args), result.code);comparisons++;}
  return result;
}
const reused=`function main(n) {
  let temp, sum, i;
  sum=0; i=0;
  while(i<n) {
    temp=i+1;
    if(temp%2===0) {temp=sum+temp;sum=temp;i=i+1;continue;}
    temp=temp*3;sum=sum+temp;i=i+1;
  }
  temp=sum+"!";return temp;
}`;
const split=equivalent(reused,Array.from({length:40},(_,i)=>[i]));
assert.ok(split.counts.splitBindings>0);
assert.ok(split.counts.constDeclarations>0);
assert.equal(split.counts.mutableDeclarations,2);
equivalent('function main(flag){let x;if(flag){x=1;}else{x=2;}return x;}',[[true],[false]]);
equivalent('function main(flag){let x;if(flag)x=1;else throw new Error("bad");return x;}',[[true],[false]]);
equivalent('function main(flag){let x;if(flag){x=1;return x;}x=2;return x;}',[[true],[false]]);
equivalent('function main(flag){let x;if(flag){x=1;}return x;}',[[true],[false]]);
equivalent('function main(n){let x,i;x=0;i=0;while(i<n){x=x+1;i=i+1;if(i===2)break;}return x;}',[[0],[1],[2],[3]]);
equivalent('function main(){let x;const before=x;x=3;return [before,x];}',[[]]);
equivalent('function main(){let x;return x;}',[[]]);
equivalent('function main(flag){let x,y;x={value:3};y=x;x=4;return [y,x];}',[[true],[false]]);
equivalent('function main(){let temp;temp=3;const a={temp};temp=4;return [a,{temp}];}',[[]]);
equivalent('function main(){let x;function f(){return x;}x=1;const first=f();x=2;return [first,f()];}',[[]]);
equivalent('function main(){let x;x=()=>0;const first=x.name;x=function(){};return [first,x.name];}',[[]]);
equivalent('function main(){let x=x;return x;}',[[]]);
equivalent('function main(){const before=typeof x;let x;return before;}',[[]]);
equivalent('function main(){let x;try{x=1;}finally{x=2;}return x;}',[[]]);
equivalent('function main(){let x;x=1;const first=x++;return [first,x];}',[[]]);
equivalent('function main(){let x;x=1;x+=2;return x;}',[[]]);
equivalent('function main(){let a,b;a=1;b=(a=2)+a;return [a,b];}',[[]]);
equivalent('function main(flag){let x=3;if(flag){let x=4;return x;}return x;}',[[true],[false]]);
equivalent('function main(){"use strict";let x;x=1;return [x,(function(){return this;})()];}',[[]]);
assert.throws(()=>cleanBindings('function main(){let x;return eval("x");}'),/direct eval/);
assert.throws(()=>cleanBindings('function main(o){with(o){return x;}}'),/with/);
const result=cleanBindings('function main(){let x,y;x=1;y=2;return x+y;}');
const ast=acorn.parse(result.code,{ecmaVersion:2022});
assert.ok(ast.body[0].body.body.filter(n=>n.type==='VariableDeclaration').every(n=>n.declarations.length===1));
assert.ok(ast.body[0].body.body.filter(n=>n.type==='VariableDeclaration').every(n=>n.kind==='const'));
equivalent('function main(){let x;"use strict";x=1;return [x,(function(){return this===undefined;})()];}',[[]]);
equivalent('function main(flag){let x;var calls=0;if(flag)x=(calls++,7);return calls;}',[[true],[false]]);
console.log(`${comparisons} binding-cleanup semantic comparisons passed, including loops, joins, TDZ, capture, inferred names and mutation exclusions`);
