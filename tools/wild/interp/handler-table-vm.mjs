// style: handler-table VM (an array of handler functions indexed by numeric opcode, VM state in an object)
// residue: \b(HANDLERS|op[A-Z][A-Za-z]+)\b
// A stack VM whose dispatch is a table of functions, one per opcode, each
// taking the machine; the program is written with mnemonics and translated
// to opcode numbers at load. The fixed program scans a string: the number
// of words, the longest word, and a djb2-style hash of every character.
function opHalt(vm) { vm.running = false; }
function opPush(vm, arg) { vm.stack.push(arg); }
function opLoad(vm, arg) { vm.stack.push(vm.locals[arg]); }
function opStore(vm, arg) { vm.locals[arg] = vm.stack.pop(); }
function opAdd(vm) { const b = vm.stack.pop(); vm.stack.push(vm.stack.pop() + b); }
function opMul(vm) { const b = vm.stack.pop(); vm.stack.push(vm.stack.pop() * b); }
function opXor(vm) { const b = vm.stack.pop(); vm.stack.push(vm.stack.pop() ^ b); }
function opUint32(vm) { vm.stack.push(vm.stack.pop() >>> 0); }
function opLt(vm) { const b = vm.stack.pop(); vm.stack.push(vm.stack.pop() < b ? 1 : 0); }
function opGt(vm) { const b = vm.stack.pop(); vm.stack.push(vm.stack.pop() > b ? 1 : 0); }
function opEq(vm) { const b = vm.stack.pop(); vm.stack.push(vm.stack.pop() === b ? 1 : 0); }
function opJump(vm, arg) { vm.pc = arg; }
function opJumpIfFalse(vm, arg) { if (!vm.stack.pop()) vm.pc = arg; }
function opJumpIfTrue(vm, arg) { if (vm.stack.pop()) vm.pc = arg; }
function opLen(vm) { vm.stack.push(vm.input.length); }
function opCharAt(vm) { vm.stack.push(vm.input.charCodeAt(vm.stack.pop())); }
function opReturn(vm, arg) {
  vm.result = vm.stack.splice(vm.stack.length - arg, arg);
  vm.running = false;
}

const HANDLERS = [opHalt, opPush, opLoad, opStore, opAdd, opMul, opXor, opUint32, opLt, opGt,
  opEq, opJump, opJumpIfFalse, opJumpIfTrue, opLen, opCharAt, opReturn];
const MNEMONICS = ["halt", "push", "load", "store", "add", "mul", "xor", "u32", "lt", "gt",
  "eq", "jmp", "jf", "jt", "len", "charat", "ret"];

// locals: 0 i, 1 hash, 2 words, 3 inWord, 4 cur, 5 longest, 6 c
const SOURCE = [
  ["push", 0], ["store", 0],
  ["push", 5381], ["store", 1],
  ["push", 0], ["store", 2],
  ["push", 0], ["store", 3],
  ["push", 0], ["store", 4],
  ["push", 0], ["store", 5],
  "loop:",
  ["load", 0], ["len"], ["lt"], ["jf", "end"],
  ["load", 0], ["charat"], ["store", 6],
  ["load", 6], ["push", 32], ["eq"], ["jf", "letter"],
  // a space ends the word in progress
  ["load", 4], ["load", 5], ["gt"], ["jf", "reset"],
  ["load", 4], ["store", 5],
  "reset:",
  ["push", 0], ["store", 4],
  ["push", 0], ["store", 3],
  ["jmp", "hash"],
  "letter:",
  ["load", 3], ["jt", "inword"],
  ["load", 2], ["push", 1], ["add"], ["store", 2],
  ["push", 1], ["store", 3],
  "inword:",
  ["load", 4], ["push", 1], ["add"], ["store", 4],
  "hash:",
  ["load", 1], ["push", 33], ["mul"], ["load", 6], ["xor"], ["u32"], ["store", 1],
  ["load", 0], ["push", 1], ["add"], ["store", 0],
  ["jmp", "loop"],
  "end:",
  ["load", 4], ["load", 5], ["gt"], ["jf", "out"],
  ["load", 4], ["store", 5],
  "out:",
  ["load", 2], ["load", 5], ["load", 1], ["ret", 3],
];

function load(source) {
  const labels = {};
  let n = 0;
  for (const line of source) {
    if (typeof line === "string") labels[line.slice(0, -1)] = n;
    else n++;
  }
  const program = [];
  for (const line of source) {
    if (typeof line === "string") continue;
    const opcode = MNEMONICS.indexOf(line[0]);
    if (opcode < 0) throw new Error("unknown mnemonic " + line[0]);
    let arg = line.length > 1 ? line[1] : 0;
    if (typeof arg === "string") {
      if (!(arg in labels)) throw new Error("unknown label " + arg);
      arg = labels[arg];
    }
    program.push(opcode, arg);
  }
  return program;
}

const PROGRAM = load(SOURCE);

function run(program, input) {
  const vm = { pc: 0, stack: [], locals: new Array(8).fill(0), input, running: true, result: null };
  while (vm.running) {
    const at = vm.pc * 2;
    vm.pc++;
    HANDLERS[program[at]](vm, program[at + 1]);
  }
  return vm.result;
}

export function main(input) {
  return run(PROGRAM, String(input));
}
export const inputs = [
  "",
  "a",
  "   ",
  "  hi  there ",
  "the quick brown fox jumps over the lazy dog",
  "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope, it was the winter of despair.",
  "supercalifragilisticexpialidocious antidisestablishmentarianism floccinaucinihilipilification pneumonoultramicroscopicsilicovolcanoconiosis",
];
