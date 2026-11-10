// inputs: [{"n": -3}, {"n": 0}, {"n": "proto"}]
// An accessor for index 0 on Array.prototype: an element write calls its setter, a read its getter (pad partial-new-bugs, from the residual-language branch's C corpus).
var hits=0;
Object.defineProperty(Array.prototype,"0",{get:function(){return 17;},set:function(v){hits+=v;},configurable:true});
function main(input){var a=[];a[0]=input.n;return [a[0],a.length,hits,0 in a,1 in a];}
