// inputs: [{"n": 1, "replace": false}, {"n": 1, "replace": true}, {"n": 9, "replace": false}, {"n": 9, "replace": true}]
// From the residual-language branch's C corpus (corpus-c/cases/native-global-rebinding.js),
// where master's specializer got it wrong or did not finish.
function first(x){return x+1;}
function second(x){return x+10;}
var selected=first;
function main(input){
 if(input.replace)selected=second;
 let before=selected(input.n);
 let old=selected;
 selected=first.bind(null);
 let bound=selected(input.n);
 selected=second;
 return [before,bound,old(input.n),selected(input.n)];
}
