// inputs: [{"n": -3, "limit": 0}, {"n": 0, "limit": 1}, {"n": 5, "limit": 8}, {"n": 12, "limit": 70}]
// From the residual-language branch's C corpus (corpus-c/cases/native-argument-specialization.js),
// where master's specializer got it wrong or did not finish.
function choose(mode,x){try{if(mode==="add")return x+1;return x*2;}catch(e){return 0;}}
function make(k){return function(mode,x){try{if(mode===1)return k+x;return k*x;}catch(e){return -1;}};}
function growing(n,limit){if(n>=limit)return n;return growing(n+1,limit);}
function reassigned(mode,x){try{if(x<0)mode="mul";if(mode==="add")return x+1;return x*2;}finally{mode="done";}}
function aliased(mode,x){arguments[0]="mul";try{if(mode==="add")return x+1;return x*2;}catch(e){return 0;}}
function caught(mode,x){try{if(x<0)throw "mul";return mode;}catch(mode){return mode;}}
function main(input){let x=input.n,f=make(x),effects=0;let values=[choose("add",x),choose("mul",x),f(1,x),f(2,x),growing(0,input.limit),reassigned("add",x),aliased("add",x),caught("add",x),choose("add",x,effects++)];class C{}let error;try{C();}catch(e){error=e.name;}return [values,effects,error];}
