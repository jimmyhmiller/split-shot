import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decode, instantiate, invoke } from './interpreter.mjs';
import { initSync, specialize } from '../../playground/web/src/pkg/partial_wasm.js';
let checks = 0;
async function load(name) {
  const bytes = readFileSync(new URL(name, import.meta.url));
  const m = decode(bytes), state = instantiate(m);
  const native = (await WebAssembly.instantiate(bytes)).instance.exports;
  function compare(name, args) {
    let a, b, ae, be;
    try { a = invoke(m,state,m.exports[name].index,args); } catch (e) { ae = e; }
    try { b = native[name](...args); } catch (e) { be = e; }
    assert.equal(!!ae,!!be,`${name}(${args}) trap mismatch: ${ae}`);
    if (!ae) assert.ok(Object.is(a,b),`${name}(${args}): ${a} != ${b}`);
    checks++; return a;
  }
  return {compare};
}
const hash = await load('hash.wasm');
for (const n of [-5,0,1,2,17,100,1000]) hash.compare('hash',[n]);
const c = await load('features.wasm');
for (const n of [-100,0,1,17,1000]) {
  c.compare('memory_sum',[n]);
  c.compare('indirect',[n,0]); c.compare('indirect',[n,1]);
  c.compare('floating',[n/4]);
  c.compare('wide',[BigInt(n),9223372036854775807n]);
}
const s = await load('semantics.wasm');
for (const n of [-1,0,1,2,31,32,2147483647,-2147483648]) {
  for (const name of ['block','if','table','select','counts','global']) s.compare(name,[n]);
  for (const b of [-1,0,1,2,31,32]) for (const name of ['div','rem','rotate']) s.compare(name,[n,b]);
}
for (const i of [0,1,2,3,-1]) s.compare('indirect',[19,i]);
for (const address of [0,16,65532,65533,-1]) s.compare('memory',[address,0x12345678]);
s.compare('data',[]); s.compare('trap',[]);
for (const a of [0n,1n,-1n,9223372036854775807n]) for (const b of [0n,1n,63n,64n,-1n]) {
 s.compare('wide',[a,b]); s.compare('wideShift',[a,b]);
}
for (const n of [0,-0,1,-1,1.5,Infinity,-Infinity,NaN]) s.compare('float',[n]);
initSync({module:readFileSync(new URL('../../playground/web/src/pkg/partial_wasm_bg.wasm',import.meta.url))});
const source = readFileSync(new URL('interpreter.mjs',import.meta.url),'utf8')+'\n'+readFileSync(new URL('../../playground/examples/wasm-binary.mjs',import.meta.url),'utf8');
const start = performance.now();
const r = specialize(source,'main',0,true,true);
const compiled = await import('data:text/javascript;base64,'+Buffer.from(r.js).toString('base64'));
assert.doesNotMatch(r.js,/\b(?:decode|invoke|opcode|labels|wasmModule)\b/,'interpreter must compile away');
for (let n=-10;n<=100;n++) assert.equal(compiled.main({n}),hash.compare('hash',[n]));
console.log(`PASS: ${checks} native differential checks; interpreter compiled away in ${Math.round(performance.now()-start)} ms (${r.js.split('\n').length} lines)`);
r.free();
