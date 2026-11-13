// A threaded VM whose loop primitive writes the return stack under another
// name (`rs = vm.rstack`) on both arms of a runtime `if`: the stack stays
// modeled across the branch, as the record that holds it does (it was made
// a runtime value before the branch, and with it the thread it held and
// the whole dictionary). The program compiles to a counted loop.
const prim = (code) => ({ code, body: null });
const LIT = prim((vm) => vm.ds.push(vm.thread[vm.ip++]));
const ADD = prim((vm) => { const b = vm.ds.pop(); vm.ds.push((vm.ds.pop() + b) | 0); });
const DUP = prim((vm) => vm.ds.push(vm.ds[vm.ds.length - 1]));
const SWAP = prim((vm) => { const b = vm.ds.pop(), a = vm.ds.pop(); vm.ds.push(b, a); });
const I = prim((vm) => vm.ds.push(vm.rstack[vm.rstack.length - 1]));
const DO = prim((vm) => { const start = vm.ds.pop(), limit = vm.ds.pop(); vm.rstack.push(limit, start); });
const LOOP = prim((vm) => {
  const rs = vm.rstack;
  const index = rs[rs.length - 1] + 1;
  if (index === rs[rs.length - 2]) { rs.length -= 2; vm.ip++; }
  else { rs[rs.length - 1] = index; vm.ip = vm.thread[vm.ip]; }
});
const EXIT = prim((vm) => {
  if (vm.rstack.length === 0) { vm.thread = null; return; }
  vm.ip = vm.rstack.pop();
  vm.thread = vm.rstack.pop();
});
// : sum-to ( n -- s ) 0 swap 1 do i + loop ;      (n > 1)
const SUM_TO = { code: null, body: [LIT, 0, SWAP, LIT, 1, DO, I, ADD, LOOP, 6, EXIT] };
// : main ( n -- s s ) sum-to dup ;
const MAIN = { code: null, body: [SUM_TO, DUP, EXIT] };
function execute(word, ds) {
  const vm = { ds, rstack: [], thread: word.body, ip: 0 };
  while (vm.thread !== null) {
    const xt = vm.thread[vm.ip++];
    if (xt.code !== null) xt.code(vm);
    else { vm.rstack.push(vm.thread, vm.ip); vm.thread = xt.body; vm.ip = 0; }
  }
  return vm.ds;
}
export function main(input) {
  return execute(MAIN, [(input.n | 0) + 2]);
}
