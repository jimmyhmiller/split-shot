// inputs: [{"n": -3}, {"n": 0}, {"n": 5}]
// From the residual-language branch's C corpus (corpus-c/cases/native-global-accessors.js),
// where master's specializer got it wrong or did not finish.
function main(input){
  let storage=3,hits=0;
  Object.defineProperty(globalThis,'guardedGlobal',{get:function(){hits++;return storage;},set:function(v){hits++;storage=v;},configurable:true});
  Object.defineProperty(globalThis,'readonlyGlobal',{value:4,writable:false,configurable:true});
  let a=guardedGlobal;
  guardedGlobal=input.n;
  let b=guardedGlobal;
  readonlyGlobal=input.n;
  let error='none';
  function strictWrite(){'use strict';readonlyGlobal=input.n;}
  try{strictWrite();}catch(e){error=e.name;}
  return [a,b,storage,hits,readonlyGlobal,error];
}
