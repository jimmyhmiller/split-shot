'use strict';
// Executable reference for the object projection host ABI. No guest AST is
// executed here. Functions are data; their code is executed by the interpreter.
const U = Object.freeze({tag: 0}), N = Object.freeze({tag: 1});
const V = (tag, payload) => ({tag, payload});
let roots;
function resetObjectRuntime() { roots = undefined; }
// `slots` is a Map in insertion order, so a property's position in it is the
// slot number a shape would assign; `inline` is how many slots are inline.
const INLINE_SLOT_LIMIT=128;
// `flags` holds the attributes of properties that are not plain assigned
// ones: 1 writable, 2 enumerable, 4 configurable. Absent means all three.
function ref(kind, prototype, slots) { return V(4, {kind, prototype, slots: new Map(), flags: new Map(), inline: Math.min(slots,INLINE_SLOT_LIMIT), code: -1, env: N, elements: []}); }
function attributes(o,key) {return o.flags.has(key)?o.flags.get(key):7;}
function readOnly() {raise('TypeError','Cannot assign to read only property');}
// An error the guest program can catch is a guest error object, thrown as a
// guest value. A host Error is a failure of the runtime contract and is not
// catchable by guest code.
function raise(kind, message) { const e = objError(vStr(message)); objSet(e, 3, vStr(kind)); throw e; }
function needObject(v) { if (!v || v.tag !== 4) raise('TypeError', 'object reference required'); return v.payload; }
function vNum(n) { if (typeof n !== 'number') throw new TypeError('number required'); return V(3,n); }
function vBool(n) { return V(2,!!n); }
function vNull() { return N; }
function vUndef() { return U; }
function vStr(s) { if(typeof s!=='string')throw new TypeError('string required');return V(5,s); }
function vNumber(v) { if(v.tag!==3)throw new TypeError('numeric value required');return v.payload; }
function primitive(v) { switch(v.tag){case 0:return undefined;case 1:return null;case 2:case 3:case 5:return v.payload;default:throw new TypeError('object coercion requires guest lowering');} }
function box(v) { if(v===undefined)return U;if(v===null)return N;if(typeof v==='boolean')return V(2,v);if(typeof v==='number')return V(3,v);if(typeof v==='string')return V(5,v);throw new TypeError('unsupported primitive'); }
function vTruth(v) { return v.tag===4?1:+!!primitive(v); }
function vIsNullish(v) { return +(v.tag===0||v.tag===1); }
function vStrictEq(a,b) { if(a.tag!==b.tag)return 0;if(a.tag<2)return 1;return +(a.payload===b.payload); }
function vLooseEq(a,b) { if(a.tag===b.tag)return vStrictEq(a,b);if(a.tag<2||b.tag<2)return +(a.tag<2&&b.tag<2);if(a.tag===4||b.tag===4)throw new TypeError('object coercion requires guest lowering');return +(primitive(a)==primitive(b)); }
function vUnary(op,a) { if(op===3)return vBool(!vTruth(a));if(op===5)return U;const x=primitive(a);switch(op){case 1:return box(-x);case 2:return box(+x);case 4:return box(~x);default:throw new TypeError('invalid unary opcode');} }
function vBinary(op,a,b) {
 if(op===7)return vBool(vStrictEq(a,b));if(op===8)return vBool(!vStrictEq(a,b));if(op===9)return vBool(vLooseEq(a,b));if(op===10)return vBool(!vLooseEq(a,b));
 if(op===21)return vTruth(a)?b:a;if(op===22)return vTruth(a)?a:b;if(op===23)return vIsNullish(a)?b:a;
 const x=primitive(a),y=primitive(b);switch(op){case 1:return box(x+y);case 2:return box(x-y);case 3:return box(x*y);case 4:return box(x/y);case 5:return box(x%y);case 6:return box(x**y);case 11:return box(x<y);case 12:return box(x<=y);case 13:return box(x>y);case 14:return box(x>=y);case 15:return box(x|y);case 16:return box(x&y);case 17:return box(x^y);case 18:return box(x<<y);case 19:return box(x>>y);case 20:return box(x>>>y);default:throw new TypeError('invalid binary opcode');}
}
function objRootProto(kind) {
 if(!roots){const object=ref(0,N,0);const array=ref(0,object,0);const fn=ref(0,object,0);roots=[object,array,fn,ref(0,object,0),ref(0,object,0),ref(0,object,0)];}
 if(!Number.isInteger(kind)||kind<0||kind>5)throw new TypeError('invalid root prototype');return roots[kind];
}
function objNew(prototype,slots) { if(prototype.tag!==1)needObject(prototype);if(!Number.isInteger(slots)||slots<0)throw new RangeError('invalid slot count');return ref(0,prototype,slots); }
function arrayNewLength(length) { if(!Number.isInteger(length)||length<0||length>4294967295)raise('RangeError','invalid array length');const v=ref(1,objRootProto(1),0);v.payload.elements=new Array(length);return v; }
function arrayNewLiteral(length) { return arrayNewLength(length); }
function atom(key) { if(!Number.isInteger(key)||key<0)throw new TypeError('invalid key atom');return key; }
// A string, number or boolean reads through its root prototype (3, 4, 5).
function primitiveGet(v,key) {if(v.tag===5){if(key===0)return vNum(v.payload.length);return objGet(objRootProto(3),key);}if(v.tag===3)return objGet(objRootProto(4),key);if(v.tag===2)return objGet(objRootProto(5),key);return needObject(v);}
// A named load whose base is not proved to be an object.
function objGetAny(v,key) {key=atom(key);if(!v||v.tag!==4)return primitiveGet(v,key);return objGet(v,key);}
function objGet(v,key) {key=atom(key);const o=needObject(v);if(o.kind===1&&key===0)return vNum(o.elements.length);if(o.slots.has(key))return o.slots.get(key);return o.prototype.tag===1?U:objGet(o.prototype,key);}
function objSet(v,key,value) {key=atom(key);const o=needObject(v);if(o.kind===1&&key===0){const n=vNumber(value);if(!Number.isInteger(n)||n<0||n>4294967295)raise('RangeError','invalid array length');o.elements.length=n;return value;}
 if(o.slots.has(key)){if(!(attributes(o,key)&1))readOnly();}
 // Assignment cannot shadow an inherited non-writable property.
 else for(let p=o.prototype;p.tag!==1;p=p.payload.prototype)if(p.payload.slots.has(key)){if(!(attributes(p.payload,key)&1))readOnly();break;}
 o.slots.set(key,value);return value;}
function objHasOwn(v,key) {const o=needObject(v);return +((o.kind===1&&key===0)||o.slots.has(atom(key)));}
function objProto(v) { return needObject(v).prototype; }
function arrayIndex(i) {if(!Number.isInteger(i)||i<0||i>=4294967295)throw new RangeError('array index outside intrinsic contract');return i;}
// Numeric indexed prototypes use a separate ABI so an atom cannot alias an index.
function arrGet(v,index) {const o=needObject(v);if(o.kind!==1)throw new TypeError('array required');index=arrayIndex(index);if(Object.hasOwn(o.elements,index))return o.elements[index];return arrProtoGet(o.prototype,index);}
function arrProtoGet(v,index) {if(v.tag===1)return U;const o=needObject(v);const k='index:'+index;if(o.slots.has(k))return o.slots.get(k);return arrProtoGet(o.prototype,index);}
function arrSet(v,index,value) {const o=needObject(v);if(o.kind!==1)throw new TypeError('array required');o.elements[arrayIndex(index)]=value;return value;}
function arrHas(v,index) {const o=needObject(v);return +Object.hasOwn(o.elements,arrayIndex(index));}
function objSetIndex(v,index,value) {needObject(v).slots.set('index:'+arrayIndex(index),value);return value;}
// Lexical environments are heap data that only the interpreter handles (tag 6).
function needEnv(v) { if(!v||v.tag!==6)throw new TypeError('environment required');return v.payload; }
function needScope(v) { if(v&&v.tag===1)return v;needEnv(v);return v; }
function envNew(parent,slots,receiver) {if(!Number.isInteger(slots)||slots<0)throw new RangeError('invalid environment size');return V(6,{parent:needScope(parent),receiver,slots:Array(slots).fill(U)});}
function envParent(e) {return needEnv(e).parent;}
function envReceiver(e) {return needEnv(e).receiver;}
function envSlot(e,i) {const s=needEnv(e).slots;if(!Number.isInteger(i)||i<0||i>=s.length)throw new RangeError('environment slot');return s;}
function envGet(e,i) {return envSlot(e,i)[i];}
function envSet(e,i,v) {envSlot(e,i)[i]=v;return v;}
function envCopy(e) {const o=needEnv(e);return V(6,{parent:o.parent,receiver:o.receiver,slots:o.slots.slice()});}
// `slots` sizes what the function constructs and `prototypeSlots` its prototype object.
function fnNew(code,env,slots,prototypeSlots) {needScope(env);if(!Number.isInteger(slots)||slots<0)throw new RangeError('invalid instance slot count');const f=ref(2,objRootProto(2),2);f.payload.code=code;f.payload.env=env;f.payload.constructible=true;f.payload.instanceSlots=slots;const p=objNew(objRootProto(0),prototypeSlots);objSet(f,1,p);objSet(p,2,f);return f;}
function fnCode(v) {const o=needObject(v);if(o.kind!==2)raise('TypeError','callable required');return o.code;}
function fnEnv(v) {const o=needObject(v);if(o.kind!==2)raise('TypeError','callable required');return o.env;}
function allocValues(n) {if(!Number.isInteger(n)||n<0)throw new RangeError('invalid value buffer');return Array(n).fill(U);}
function loadValue(a,i) {if(!Number.isInteger(i)||i<0||i>=a.length)throw new RangeError('value buffer index');return a[i];}
function storeValue(a,i,v) {if(!Number.isInteger(i)||i<0||i>=a.length)throw new RangeError('value buffer index');a[i]=v;return v;}
const api={vNum,vBool,vNull,vUndef,vStr,vNumber,vTruth,vIsNullish,vStrictEq,vLooseEq,vUnary,vBinary,objRootProto,objNew,objGet,objSet,objHasOwn,objProto,arrayNewLength,arrayNewLiteral,arrGet,arrSet,arrHas,objSetIndex,fnNew,fnCode,fnEnv,allocValues,loadValue,storeValue,resetObjectRuntime};
if(typeof module!=='undefined')module.exports=api;
function constructResult(receiver,value) {return value.tag===4?value:receiver;}
function objError(message) {const e=objNew(objRootProto(0),2);e.payload.kind=3;objSet(e,3,vStr('Error'));objSet(e,4,vStr(message.tag===0?'':String(primitive(message))));return e;}
function throwValue(value) {throw value;}
function failCall() {raise('TypeError','callable required');}
function objectRootProto(kind) {return objRootProto(kind);}
Object.assign(api,{constructResult,objError,throwValue,failCall,objectRootProto});
function allocF64(n) {if(!Number.isInteger(n)||n<0)throw new RangeError('numeric buffer size');return new Float64Array(n);}
function loadF64(a,i) {if(!Number.isInteger(i)||i<0||i>=a.length)throw new RangeError('numeric buffer index');return a[i];}
function storeF64(a,i,v) {if(!Number.isInteger(i)||i<0||i>=a.length)throw new RangeError('numeric buffer index');a[i]=v;return v;}
function f64Sqrt(n) {return Math.sqrt(n);}
function failCapacity() {throw new RangeError('interpreter frame capacity exceeded');}
Object.assign(api,{allocF64,loadF64,storeF64,f64Sqrt,failCapacity});
let currentGuestFrame, guestDispatcher, sharedValueBuffers=[], sharedNumberBuffers=[];
// Guest call nesting is a bounded host resource. Exceeding it is a capacity
// failure, never a host stack overflow.
const GUEST_CALL_DEPTH_LIMIT=256;let guestCallDepth=0;
function enterGuest() {if(guestCallDepth>=GUEST_CALL_DEPTH_LIMIT)failCapacity();guestCallDepth++;}
function leaveGuest() {guestCallDepth--;}
function setGuestDispatcher(dispatch) {guestDispatcher=dispatch;}
function callGuest(code,env,receiver,args) {if(typeof guestDispatcher!=='function')throw new TypeError('missing guest dispatcher');enterGuest();const saved=currentGuestFrame;currentGuestFrame={env,receiver,args};try{return guestDispatcher(code);}finally{currentGuestFrame=saved;leaveGuest();}}
// A call whose target is probably one of the listed codes. They are hints.
function callGuestOneOf(code,env,receiver,args,first,second,third,fourth) {return callGuest(code,env,receiver,args);}
function callEnv(input) {if(!currentGuestFrame)throw new TypeError('missing guest frame');return currentGuestFrame.env;}
function callThis(input) {if(!currentGuestFrame)throw new TypeError('missing guest frame');return currentGuestFrame.receiver;}
function callArgCount(input) {if(!currentGuestFrame)throw new TypeError('missing guest frame');return currentGuestFrame.args.length;}
function callCount(input) {return callArgCount(input);}
function callArg(input,i) {if(!currentGuestFrame)throw new TypeError('missing guest frame');if(!Number.isInteger(i)||i<0)throw new RangeError('invalid argument index');return i<currentGuestFrame.args.length?currentGuestFrame.args[i]:vUndef();}
// A call under which a guest throw is intercepted: the result is then the
// thrown value and tookThrow() reports 1 once. Host failures pass through.
let caughtThrow=0;
function isGuestValue(e) {return e!==null&&typeof e==='object'&&typeof e.tag==='number';}
function protectedInvoke(thunk) {const depth=guestCallDepth,frame=currentGuestFrame;try{const v=thunk();caughtThrow=0;return v;}catch(e){if(!isGuestValue(e))throw e;guestCallDepth=depth;currentGuestFrame=frame;caughtThrow=1;return e;}}
function callGuestProtected(code,env,receiver,args) {return protectedInvoke(()=>callGuest(code,env,receiver,args));}
function tookThrow() {const taken=caughtThrow;caughtThrow=0;return taken;}
// Call with the current activation's own arguments from position `skip` on.
function callGuestRest(code,env,receiver,input,skip) {if(!currentGuestFrame)throw new TypeError('missing guest frame');if(!Number.isInteger(skip)||skip<0)throw new RangeError('invalid argument offset');return callGuest(code,env,receiver,currentGuestFrame.args.slice(skip));}
function sharedValues(id,n) {if(!Number.isInteger(id)||id<0||id>=8)throw new RangeError('shared buffer id');if(!sharedValueBuffers[id])sharedValueBuffers[id]=allocValues(n);else if(sharedValueBuffers[id].length!==n)throw new RangeError('shared buffer size mismatch');return sharedValueBuffers[id];}
function sharedF64(id,n) {if(!Number.isInteger(id)||id<0||id>=8)throw new RangeError('shared buffer id');if(!sharedNumberBuffers[id])sharedNumberBuffers[id]=allocF64(n);else if(sharedNumberBuffers[id].length!==n)throw new RangeError('shared buffer size mismatch');return sharedNumberBuffers[id];}
const initialResetObjectRuntime=resetObjectRuntime;
resetObjectRuntime=function(){initialResetObjectRuntime();atomNames=new Map();sharedValueBuffers=[];sharedNumberBuffers=[];currentGuestFrame=undefined;guestCallDepth=0;};
Object.assign(api,{callGuestOneOf,protectedInvoke,callGuestProtected,tookThrow,callGuestRest,enterGuest,leaveGuest,setGuestDispatcher,callGuest,callEnv,callThis,callArgCount,callCount,callArg,sharedValues,sharedF64,resetObjectRuntime});
function allocArgs(n) {return allocValues(n);}
function setObjectFunctions(functions) {setGuestDispatcher(code=>{if(!Number.isInteger(code)||typeof functions[code]!=='function')return failCall();return functions[code](0);});}
Object.assign(api,{allocArgs,setObjectFunctions});

function fnNewArrow(code,env) {needScope(env);const f=ref(2,objRootProto(2),2);f.payload.code=code;f.payload.env=env;f.payload.constructible=false;return f;}
function constructReceiver(f) {const o=needObject(f);if(o.kind!==2||!o.constructible)raise('TypeError','function is not a constructor');const proto=objGet(f,1);return objNew(proto.tag===4?proto:objRootProto(0),o.instanceSlots);}
Object.assign(api,{fnNewArrow,constructReceiver,envNew,envParent,envReceiver,envGet,envSet,envCopy});

// Operations selected when whole-program analysis has proved a precondition.
// The reference checks the proof, so an unsound analysis fails loudly here.
function violated(what) {throw new Error('analysis violation: '+what);}
function objGetOwn(v,key) {key=atom(key);const o=needObject(v);if(!o.slots.has(key))violated('property proved own is absent');return o.slots.get(key);}
function vBinaryNumber(op,a,b) {if(a.tag!==3||b.tag!==3)violated('binary operand proved numeric is not a number');return vBinary(op,a,b);}
function vUnaryNumber(op,a) {if(a.tag!==3)violated('unary operand proved numeric is not a number');return vUnary(op,a);}
// A property proved to be inline slot `slot` of every object the base can be.
function slotOf(o,key) {let i=0;for(const k of o.slots.keys()){if(k===key)return i;i++;}return -1;}
function checkSlot(o,key,slot) {if(!Number.isInteger(slot)||slot<0||slotOf(o,key)!==slot||slot>=o.inline)violated('property is not at its proved inline slot');}
function objGetSlot(v,key,slot) {key=atom(key);const o=needObject(v);checkSlot(o,key,slot);return o.slots.get(key);}
// A store to a property the base is proved to own already.
function objSetOwn(v,key,value) {const o=needObject(v);key=atom(key);if(!o.slots.has(key)||!(attributes(o,key)&1))violated('stored property proved own is absent or not writable');o.slots.set(key,value);return value;}
function objSetSlot(v,key,slot,value) {const o=needObject(v);key=atom(key);checkSlot(o,key,slot);if(!(attributes(o,key)&1))violated('stored property proved writable is not');o.slots.set(key,value);return value;}
// Runtime property names: usable only when they spell one of the program's
// static atoms, which the program registers at start.
let atomNames=new Map();
function atomName(key,name) {atom(key);if(typeof name!=='string')throw new TypeError('invalid property atom name');atomNames.set(name,key);return U;}
function nameAtom(key) {if(key.tag!==5)throw new TypeError('property key must be a number or a string');if(key.payload==='length')return 0;const a=atomNames.get(key.payload);return a===undefined||a===0?-1:a;}
function keyedGet(v,key) {if(key.tag===3)return arrGet(v,key.payload);const a=nameAtom(key);if(a<0){needObject(v);return U;}return objGet(v,a);}
function keyedSet(v,key,value) {if(key.tag===3)return arrSet(v,key.payload,value);const a=nameAtom(key);if(a<0)throw new RangeError("property name computed at run time is not one of the program's static names");return objSet(v,a,value);}
// Strings and numbers as the builtin prelude needs them.
function needString(v) {if(!v||v.tag!==5)throw new TypeError('string required');return v.payload;}
function strCharCodeAt(s,i) {const t=needString(s);return i>=0&&i<t.length?t.charCodeAt(i):NaN;}
function strFromCharCode(n) {return vStr(String.fromCharCode(n));}
function strSlice(s,from,to) {const t=needString(s),n=t.length;let a=from>0?Math.min(from,n):0,b=to>0?Math.min(to,n):0;a=Math.trunc(a);b=Math.trunc(b);if(b<a)b=a;return vStr(t.slice(a,b));}
function strIndexOf(s,needle,from) {const t=needString(s);return t.indexOf(needString(needle),from>0?Math.min(Math.trunc(from),t.length):0);}
const mathOps=[null,Math.floor,Math.ceil,Math.round,Math.trunc,Math.abs,Math.sqrt,Math.sin,Math.cos,Math.tan,Math.asin,Math.acos,Math.atan,Math.atan2,Math.exp,Math.log,(a,b)=>a**b,Math.min,Math.max,Math.sign,Math.log2,Math.log10,Math.cbrt,Math.fround,Math.imul,Math.clz32,Math.hypot];
function f64Math(op,a,b) {const f=mathOps[op];if(!f)throw new TypeError('invalid math operation');return f(a,b);}
// base[key] when the base is not proved to be an object.
function anyGet(v,key) {if(v&&v.tag===4)return keyedGet(v,key);if(!v||(v.tag!==5&&v.tag!==3&&v.tag!==2))return needObject(v);
 if(key.tag===3){const i=key.payload;if(v.tag!==5||!(i>=0&&i<v.payload.length)||i!==Math.floor(i))return U;return vStr(v.payload[i]);}
 const a=nameAtom(key);if(a<0)return U;return primitiveGet(v,a);}
// Building argument lists and arrays whose size is known only at run time.
function needArray(v) {const o=needObject(v);if(o.kind!==1)throw new TypeError('array required');return o;}
function arrPush(v,value) {const o=needArray(v);o.elements[arrayIndex(o.elements.length)]=value;return value;}
function arrAppendAll(v,source) {const o=needArray(v);
 if(source&&source.tag===5){for(const unit of source.payload.split(''))o.elements.push(vStr(unit));return v;}
 if(!source||source.tag!==4||source.payload.kind!==1)raise('TypeError','value is not iterable (only arrays and strings are)');
 const from=source.payload.elements,n=from.length;for(let i=0;i<n;i++)o.elements.push(Object.hasOwn(from,i)?from[i]:U);return v;}
function arrValues(v) {const e=needArray(v).elements;return Array.from({length:e.length},(_,i)=>Object.hasOwn(e,i)?e[i]:U);}
function callGuestSpread(code,env,receiver,list) {return callGuest(code,env,receiver,arrValues(list));}
Object.assign(api,{arrPush,arrAppendAll,arrValues,callGuestSpread});
// A fresh object with the given prototype, and replacing an object's prototype.
function objCreate(proto) {if(proto.tag!==1&&proto.tag!==4)raise('TypeError','Object prototype may only be an Object or null');return ref(0,proto,0);}
function objSetProto(v,proto) {const o=needObject(v);if(proto.tag!==1&&proto.tag!==4)raise('TypeError','Object prototype may only be an Object or null');o.prototype=proto;return U;}
Object.assign(api,{objCreate,objSetProto});
function arrIs(v) {return +(!!v&&v.tag===4&&v.payload.kind===1);}
Object.assign(api,{objGetAny,arrIs,strCharCodeAt,strFromCharCode,strSlice,strIndexOf,f64Math,anyGet});
function vTypeof(v) {switch(v.tag){case 0:return vStr('undefined');case 1:return vStr('object');case 2:return vStr('boolean');case 3:return vStr('number');case 5:return vStr('string');case 4:return vStr(v.payload.kind===2?'function':'object');default:throw new TypeError('typeof of a non-guest value');}}
// OrdinaryHasInstance.
function objInstanceOf(v,f) {if(f.tag!==4||f.payload.kind!==2)raise('TypeError',"Right-hand side of 'instanceof' is not callable");if(v.tag!==4)return 0;const proto=objGet(f,1);if(proto.tag!==4)raise('TypeError','Function has non-object prototype in instanceof check');for(let p=v.payload.prototype;p.tag!==1;p=p.payload.prototype)if(p.payload===proto.payload)return 1;return 0;}
Object.assign(api,{vTypeof,objInstanceOf});
function indexHas(o,i) {arrayIndex(i);if(o.kind===1&&Object.hasOwn(o.elements,i))return 1;for(;;){if(o.slots.has('index:'+i))return 1;if(o.prototype.tag===1)return 0;o=o.prototype.payload;}}
function keyedHas(v,key) {let o=needObject(v);if(key.tag===3)return indexHas(o,key.payload);const a=nameAtom(key);if(a===0)return +(o.kind===1);if(a<0)return 0;for(;;){if(o.slots.has(a))return 1;if(o.prototype.tag===1)return 0;o=o.prototype.payload;}}
function sameValue(a,b) {if(a.tag===3&&b.tag===3)return Object.is(a.payload,b.payload);return !!vStrictEq(a,b);}
// fields: 1 value present; 2 writable present, 4 its value; 8 enumerable
// present, 16 its value; 32 configurable present, 64 its value.
function objDefine(v,key,value,fields) {const o=needObject(v);if(!Number.isInteger(fields)||fields<0)throw new RangeError('invalid descriptor fields');const a=nameAtom(key);if(a<=0)throw new RangeError("property name computed at run time is not one of the program's static names");
 const wanted=(fields&4?1:0)|(fields&16?2:0)|(fields&64?4:0);
 if(!o.slots.has(a)){o.slots.set(a,fields&1?value:U);o.flags.set(a,wanted);return v;}
 const current=attributes(o,a),refuse=()=>raise('TypeError','Cannot redefine property');
 if(!(current&4)){if((fields&32)&&(fields&64))refuse();if((fields&8)&&!(fields&16)!==!(current&2))refuse();if(!(current&1)){if((fields&2)&&(fields&4))refuse();if((fields&1)&&!sameValue(value,o.slots.get(a)))refuse();}}
 let updated=current;if(fields&2)updated=(updated&~1)|(wanted&1);if(fields&8)updated=(updated&~2)|(wanted&2);if(fields&32)updated=(updated&~4)|(wanted&4);
 o.flags.set(a,updated);if(fields&1)o.slots.set(a,value);return v;}
Object.assign(api,{atomName,keyedGet,keyedSet,keyedHas,objDefine});
Object.assign(api,{objGetOwn,vBinaryNumber,vUnaryNumber,objGetSlot,objSetOwn,objSetSlot});
function objRequire(v) {needObject(v);return v;}
Object.assign(api,{objRequire});
