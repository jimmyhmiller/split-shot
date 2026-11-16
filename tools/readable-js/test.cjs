const assert = require('node:assert/strict');
const vm = require('node:vm');
const {simplify} = require('./index.cjs');
let comparisons = 0;
function execute(source, args) {
  try {
    return {value: structuredClone(vm.runInNewContext(source + '\nmain(...__args)', {__args: structuredClone(args)}, {timeout: 1000}))};
  } catch (error) { return {error: error.name + ': ' + error.message}; }
}
function equivalent(source, cases, options) {
  const output = simplify(source, options);
  for (const args of cases) {
    assert.deepEqual(execute(output.code, args), execute(source, args));
    comparisons++;
  }
  return output;
}
const values = [false, true, null, undefined, 0, -0, NaN, 1, '', 'text', {}, []];
const args = values.map(value => [value]);
assert.equal(equivalent('function main(a) { return a ? 7 : a; }', args).counts.conditionalTests, 1);
assert.equal(equivalent('function main(a) { return a ? a : 7; }', args).counts.conditionalTests, 1);
equivalent('function main(a) { return a !== null ? typeof a === "object" : a !== null; }', args);
equivalent('function main(a) { var b = a; return b ? (b = false, 42) : b; }', args);
const label = `function main(a) {
  var events=[];
  while(a > 0) {
    out: {
      events.push('before');
      if (a === 2) { events.push('then'); break out; }
      inner: { if(a === 3) { events.push('inner'); break inner; } events.push('other'); }
      events.push('after');
    }
    a--;
  }
  return events;
}`;
assert.equal(equivalent(label, [[0],[1],[2],[3],[4]]).counts.labels, 2);
const chain = 'function main(a) { var events=[]; out: { events.push("before"); if(a===1){ events.push("one"); break out; } if(a===2){events.push("two");break out;} throw new Error("unknown"); } events.push("after"); return events; }';
assert.equal(equivalent(chain, [[0],[1],[2],[3]]).counts.labels, 1);
const tdz = 'function main(a) { out: { if(a) { return typeof x; break out; } let x=1; return x; } }';
assert.equal(equivalent(tdz, [[true],[false]]).counts.labels, 0);
const repeated = 'function main(a) { var x=0; out: { if(a) { x++; break out; } if(!a) break out; x=10; } return x; }';
assert.equal(equivalent(repeated, [[true],[false]]).counts.labels, 0);
const getter = `var calls=0; Object.defineProperty(globalThis, 'test', {get(){ calls++; return calls === 1 ? false : 42; }});
function main() { var result=test ? 7 : test; return [result,calls]; }`;
assert.equal(equivalent(getter, [[]]).counts.conditionalTests, 0);
const property = 'function main() { var calls=0; var o={get x(){calls++;return calls===1?false:42;}}; var result=o.x?7:o.x; return [result,calls]; }';
assert.equal(equivalent(property, [[]]).counts.conditionalTests, 0);
const coercion = 'function main(){ var n=0; var a={valueOf(){n++;return n;}};var result=(a<2)?(a<2):false;return [result,n]; }';
assert.equal(equivalent(coercion, [[]]).counts.conditionalTests, 0);
equivalent('function main(a){ var o={a}; function nested(){return a;} return [o,nested()]; }', args, {names:{main:{a:'value'}}});
equivalent('function main(obj){ let {a}=obj; return {a}; }', [[{a:3}]], {names:{main:{a:'value',obj:'input'}}});
equivalent('function main(a){ var f=()=>a; return f(); }', args, {names:{main:{a:'value'}}});
assert.throws(() => simplify('function main(a){return eval("a");}', {names:{main:{a:'value'}}}), /direct eval/);
assert.throws(() => simplify('function main(a){ with(a){ return b; }}'), /with/);
assert.throws(() => simplify('function main(a){return ()=>b+a;}', {names:{main:{a:'b'}}}), /fresh/);
for (const source of [
  'function main(){let a=()=>0;return a.name;}',
  'function main(){let a; a=function(){}; return a.name;}',
  'function main(obj){let {a=()=>0}=obj; return a.name;}'
]) assert.throws(() => simplify(source, {names:{main:{a:'value'}}}), /inferred/);
for (const truth of ['true', 'false']) for (const before of ['', '7;']) for (const inside of ['', '9;']) {
  const source = `out: { ${before} if (${truth}) { ${inside} break out; } 8; }`;
  assert.equal(vm.runInNewContext(simplify(source).code), vm.runInNewContext(source));
  comparisons++;
}
assert.throws(() => simplify('function main(a){return a;}', {names:{main:{missing:'value'}}}), /Unknown rename/);


assert.equal(equivalent('function main(a){return a["value"]+a["default"];}', [[{value:2,default:3}]]).counts.memberAccesses,2);
equivalent('function main(){var o={value:7,m(){return this.value;}};return o["m"]();}',[[]]);
equivalent('function main(a){return a?.["value"];}',[[null],[{value:3}]]);

console.log(`${comparisons} semantic comparisons passed, plus scope/eval/name-inference rejection checks`);
