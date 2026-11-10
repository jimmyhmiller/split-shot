// inputs: [0, 1, 5, 7]
// forbid: switch|code\[|__pc
// The bytecode VM with jz written as a ternary (the case Prepack won).
function run(code, n) {
  var r = [n, 0, 0, 0];
  var pc = 0;
  while (true) {
    var ins = code[pc];
    var op = ins[0];
    if (op === "li") { r[ins[1]] = ins[2]; pc = pc + 1; }
    else if (op === "mul") { r[ins[1]] = r[ins[2]] * r[ins[3]]; pc = pc + 1; }
    else if (op === "add") { r[ins[1]] = r[ins[2]] + r[ins[3]]; pc = pc + 1; }
    else if (op === "jz") { pc = r[ins[1]] === 0 ? ins[2] : pc + 1; }
    else if (op === "jmp") { pc = ins[1]; }
    else { return r[ins[1]]; }
  }
}
function main(n) {
  // r1 = 1; while (r0 != 0) { r1 = r1 * r0; r0 = r0 + -1 }; return r1
  return run([["li", 1, 1], ["li", 2, -1], ["jz", 0, 6], ["mul", 1, 1, 0], ["add", 0, 0, 2], ["jmp", 2], ["ret", 1]], n);
}
