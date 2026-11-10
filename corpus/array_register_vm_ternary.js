// inputs: [0, 1, 5, 12]
// forbid-main: === "|switch|__pc
// The array-register VM with `jz` written as a conditional expression and
// dispatched by `switch`.
var code = [["jz",0,4],["add",1,1],["dec",0],["jmp",0],["halt"]];
function main(n){ var r=[n,0], pc=0; for(;;){ var ins=code[pc];
 switch(ins[0]){ case "jz": pc = r[ins[1]] === 0 ? ins[2] : pc + 1; break;
 case "add": r[1] = r[1] + 2; pc++; break; case "dec": r[0] = r[0]-1; pc++; break;
 case "jmp": pc = ins[1]; break; case "halt": return r[1]; } } }
