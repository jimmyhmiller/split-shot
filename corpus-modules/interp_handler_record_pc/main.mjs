// A VM whose state is one record and whose instructions are handler
// functions called with it: `HANDLERS[program[at]](vm, program[at + 1])`,
// `at = vm.pc * 2`. `vm.pc` is a program counter though it indexes the
// program through a local and the program is a local, not a property of
// the record (see `dispatch_fields`, `LOCAL_BASE`); and it stays one
// through a runtime branch inside a handler, another activation than the
// loop's (`opJumpIfFalse`). The residual is the program's loop: no
// handler table, no `pc`.
function opPush(vm, arg) { vm.stack.push(arg); }
function opLoad(vm, arg) { vm.stack.push(vm.locals[arg]); }
function opStore(vm, arg) { vm.locals[arg] = vm.stack.pop(); }
function opAdd(vm) { const b = vm.stack.pop(); vm.stack.push(vm.stack.pop() + b); }
function opLt(vm) { const b = vm.stack.pop(); vm.stack.push(vm.stack.pop() < b ? 1 : 0); }
function opJump(vm, arg) { vm.pc = arg; }
function opJumpIfFalse(vm, arg) { if (!vm.stack.pop()) vm.pc = arg; }
function opInput(vm) { vm.stack.push(vm.input); }
function opReturn(vm) { vm.result = vm.stack.pop(); vm.running = false; }
const HANDLERS = [opPush, opLoad, opStore, opAdd, opLt, opJump, opJumpIfFalse, opInput, opReturn];
const [PUSH, LOAD, STORE, ADD, LT, JMP, JF, INPUT, RET] = [0, 1, 2, 3, 4, 5, 6, 7, 8];
// i = 0; sum = 0; while (i < input) { sum = sum + i; i = i + 1 } return sum
const PROGRAM = [
  PUSH, 0, STORE, 0,
  PUSH, 0, STORE, 1,
  LOAD, 0, INPUT, 0, LT, 0, JF, 17,
  LOAD, 1, LOAD, 0, ADD, 0, STORE, 1,
  LOAD, 0, PUSH, 1, ADD, 0, STORE, 0,
  JMP, 4,
  LOAD, 1, RET, 0,
];
function run(program, input) {
  const vm = { pc: 0, stack: [], locals: [0, 0], input, running: true, result: null };
  while (vm.running) {
    const at = vm.pc * 2;
    vm.pc++;
    HANDLERS[program[at]](vm, program[at + 1]);
  }
  return vm.result;
}
export function main(input) {
  return run(PROGRAM, input.n);
}
