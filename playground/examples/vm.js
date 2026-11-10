// A bytecode VM with a program counter, jumps and two registers (n and acc).
// The bytecode is static and the input is dynamic. The VM loop runs a
// dynamic number of times, but the program counter is static on every path,
// so the dispatch folds away: the residual has no opcodes, no pc and no code
// array, just the loop the bytecode describes: acc = n + (n - 1) + ... + 1.
function run(code, input) {
  let n = input;
  let acc = 0;
  let pc = 0;
  while (pc < code.length) {
    const ins = code[pc];
    const op = ins[0];
    if (op === "jz") { if (n === 0) { pc = ins[1]; } else { pc = pc + 1; } }
    else if (op === "add") { acc = acc + n; pc = pc + 1; }
    else if (op === "dec") { n = n - 1; pc = pc + 1; }
    else if (op === "jmp") { pc = ins[1]; }
    else if (op === "ret") { return acc; }
    else { pc = code.length; }
  }
  return acc;
}

function main(n) {
  const code = [
    ["jz", 4],   // 0: while (n !== 0) {
    ["add"],     // 1:   acc = acc + n
    ["dec"],     // 2:   n = n - 1
    ["jmp", 0],  // 3: }
    ["ret"]      // 4: return acc
  ];
  return run(code, n);
}
