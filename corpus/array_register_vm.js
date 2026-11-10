// inputs: [0, 1, 5, 12]
// forbid-main: === "|switch|__pc
// A bytecode VM whose registers are an array, one of them starting at a
// constant (the accumulator r[1]). Only the dynamic register is read by a
// branch; the accumulator just accumulates, so it generalizes with the loop
// and the dispatch folds (it used to keep r[1] static and unroll forever).
var code = [["jz",0,4],["add",1,1],["dec",0],["jmp",0],["halt"]];
function main(n){ var r=[n,0], pc=0; for(;;){ var ins=code[pc]; var op=ins[0];
 if (op==="jz") { if (r[ins[1]] === 0) pc = ins[2]; else pc = pc + 1; }
 else if (op==="add") { r[1] = r[1] + 2; pc++; } else if (op==="dec") { r[0] = r[0]-1; pc++; }
 else if (op==="jmp") pc = ins[1]; else return r[1]; } }
