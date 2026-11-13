// Direct-threaded code: the program compiled at load into closures, each
// returning the next index, run by `pc = threaded[pc](frame)`. A branch
// closure returns `frame.stack.pop() ? next : target`, a choice of two
// static places made at runtime: stored into the dispatch slot `pc`, it is
// two paths, each at its place, not one at a runtime index (see the
// `Store` step, `PE_NO_DISPATCH_CHOICE`). The residual is the program's
// loop over the frame's values.
function compile(code) {
  const threaded = [];
  for (let pc = 0; pc < code.length; pc++) {
    const [op, x] = code[pc];
    const next = pc + 1;
    switch (op) {
      case "push": threaded[pc] = (f) => { f.stack.push(x); return next; }; break;
      case "load": threaded[pc] = (f) => { f.stack.push(f.locals[x]); return next; }; break;
      case "store": threaded[pc] = (f) => { f.locals[x] = f.stack.pop(); return next; }; break;
      case "arg": threaded[pc] = (f) => { f.stack.push(f.arg); return next; }; break;
      case "add": threaded[pc] = (f) => { const b = f.stack.pop(); f.stack.push(f.stack.pop() + b); return next; }; break;
      case "lt": threaded[pc] = (f) => { const b = f.stack.pop(); f.stack.push(f.stack.pop() < b); return next; }; break;
      case "jz": threaded[pc] = (f) => (f.stack.pop() ? next : x); break;
      case "jmp": threaded[pc] = () => x; break;
      case "ret": threaded[pc] = (f) => { f.result = f.stack.pop(); return -1; }; break;
      default: throw new Error("cannot compile " + op);
    }
  }
  return threaded;
}
// i = 0; sum = 0; while (i < arg) { sum += i; i += 1 } return sum
const PROGRAM = compile([
  ["push", 0], ["store", 0], ["push", 0], ["store", 1],
  ["load", 0], ["arg"], ["lt"], ["jz", 17],
  ["load", 1], ["load", 0], ["add"], ["store", 1],
  ["load", 0], ["push", 1], ["add"], ["store", 0],
  ["jmp", 4],
  ["load", 1], ["ret"],
]);
function run(threaded, arg) {
  const frame = { stack: [], locals: [0, 0], arg, result: null };
  let pc = 0;
  while (pc >= 0) pc = threaded[pc](frame);
  return frame.result;
}
export function main(input) {
  return run(PROGRAM, input.n);
}
