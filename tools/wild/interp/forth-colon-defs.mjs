// style: Forth (dictionary of words, data and return stacks, colon definitions compiled from source text at load, indirect-threaded inner interpreter)
// residue: \b(xt|rstack|dictionary)\b
// A small Forth: the outer interpreter reads source text at load, compiling
// colon definitions into threaded lists of execution tokens (with LIT,
// BRANCH, 0BRANCH, (DO), (LOOP) and their inline cells); the inner
// interpreter walks those lists with a return stack. The fixed program
// counts the primes below n and takes gcd(n, 360).
const SOURCE = `
\\ stack helpers
: square ( n -- n*n ) dup * ;
: divides? ( n d -- f ) mod 0= ;
: prime? ( n -- f )
  dup 2 < if drop 0 exit then
  2 begin 2dup square >= while
    2dup divides? if 2drop 0 exit then
    1+
  repeat 2drop -1 ;
: count-primes ( n -- c )
  0 swap dup 2 > if
    2 do i prime? if 1+ then loop
  else drop then ;
: gcd ( a b -- g ) begin dup while tuck mod repeat drop ;
: main ( n -- c g ) dup count-primes swap 360 gcd ;
`;

function createForth() {
  const dictionary = new Map();
  const prim = (name, code, immediate = false) => {
    const word = { name, code, body: null, immediate };
    dictionary.set(name, word);
    return word;
  };
  const binary = (name, f) => prim(name, (vm) => { const b = vm.ds.pop(); vm.ds.push(f(vm.ds.pop(), b)); });
  const flag = (b) => (b ? -1 : 0);

  binary("+", (a, b) => (a + b) | 0);
  binary("-", (a, b) => (a - b) | 0);
  binary("*", (a, b) => Math.imul(a, b));
  binary("mod", (a, b) => { if (b === 0) throw new Error("division by zero"); return a % b; });
  binary("<", (a, b) => flag(a < b));
  binary(">", (a, b) => flag(a > b));
  binary(">=", (a, b) => flag(a >= b));
  binary("=", (a, b) => flag(a === b));
  prim("0=", (vm) => vm.ds.push(flag(vm.ds.pop() === 0)));
  prim("1+", (vm) => vm.ds.push((vm.ds.pop() + 1) | 0));
  prim("dup", (vm) => vm.ds.push(vm.ds[vm.ds.length - 1]));
  prim("drop", (vm) => { vm.ds.pop(); });
  prim("swap", (vm) => { const b = vm.ds.pop(), a = vm.ds.pop(); vm.ds.push(b, a); });
  prim("over", (vm) => vm.ds.push(vm.ds[vm.ds.length - 2]));
  prim("rot", (vm) => { const c = vm.ds.pop(), b = vm.ds.pop(), a = vm.ds.pop(); vm.ds.push(b, c, a); });
  prim("tuck", (vm) => { const b = vm.ds.pop(), a = vm.ds.pop(); vm.ds.push(b, a, b); });
  prim("2dup", (vm) => { const n = vm.ds.length; vm.ds.push(vm.ds[n - 2], vm.ds[n - 1]); });
  prim("2drop", (vm) => { vm.ds.length -= 2; });
  prim("i", (vm) => vm.ds.push(vm.rstack[vm.rstack.length - 1]));

  // Words compiled into threads, which read their inline cell at ip.
  const LIT = prim("(lit)", (vm) => vm.ds.push(vm.thread[vm.ip++]));
  const BRANCH = prim("(branch)", (vm) => { vm.ip = vm.thread[vm.ip]; });
  const ZBRANCH = prim("(0branch)", (vm) => { if (vm.ds.pop() === 0) vm.ip = vm.thread[vm.ip]; else vm.ip++; });
  const DO = prim("(do)", (vm) => { const start = vm.ds.pop(), limit = vm.ds.pop(); vm.rstack.push(limit, start); });
  const LOOP = prim("(loop)", (vm) => {
    const rs = vm.rstack;
    const index = rs[rs.length - 1] + 1;
    if (index === rs[rs.length - 2]) { rs.length -= 2; vm.ip++; }
    else { rs[rs.length - 1] = index; vm.ip = vm.thread[vm.ip]; }
  });
  const EXIT = prim("exit", (vm) => {
    if (vm.rstack.length === 0) { vm.thread = null; return; }
    vm.ip = vm.rstack.pop();
    vm.thread = vm.rstack.pop();
  });

  // The compiler: immediate words working on a control-flow stack.
  let current = null;
  const cf = [];
  const here = () => current.body.length;
  const comma = (...cells) => current.body.push(...cells);
  prim("if", () => { comma(ZBRANCH, -1); cf.push(here() - 1); }, true);
  prim("else", () => { comma(BRANCH, -1); const orig = cf.pop(); cf.push(here() - 1); current.body[orig] = here(); }, true);
  prim("then", () => { current.body[cf.pop()] = here(); }, true);
  prim("begin", () => { cf.push(here()); }, true);
  prim("while", () => { comma(ZBRANCH, -1); cf.push(here() - 1); }, true);
  prim("repeat", () => { const whileAt = cf.pop(), dest = cf.pop(); comma(BRANCH, dest); current.body[whileAt] = here(); }, true);
  prim("until", () => { comma(ZBRANCH, cf.pop()); }, true);
  prim("do", () => { comma(DO); cf.push(here()); }, true);
  prim("loop", () => { comma(LOOP, cf.pop()); }, true);
  prim(";", () => { comma(EXIT); dictionary.set(current.name, current); current = null; }, true);

  function load(source) {
    const tokens = source.replace(/\\[^\n]*/g, "").split(/\s+/).filter((t) => t.length > 0);
    for (let k = 0; k < tokens.length; k++) {
      const t = tokens[k];
      if (t === "(") { while (tokens[k] !== ")" && !tokens[k].endsWith(")")) k++; continue; }
      if (t === ":") {
        current = { name: tokens[++k], code: null, body: [], immediate: false };
        continue;
      }
      if (current === null) throw new Error("interpreting outside a definition is not supported: " + t);
      const w = dictionary.get(t);
      if (w !== undefined) {
        if (w.immediate) w.code();
        else comma(w);
      } else if (/^-?\d+$/.test(t)) {
        comma(LIT, parseInt(t, 10));
      } else {
        throw new Error("undefined word " + t);
      }
    }
    if (current !== null || cf.length !== 0) throw new Error("unterminated definition");
  }

  // The inner interpreter.
  function execute(word, ds) {
    const vm = { ds, rstack: [], thread: word.body, ip: 0 };
    while (vm.thread !== null) {
      const xt = vm.thread[vm.ip++];
      if (xt.code !== null) {
        xt.code(vm);
      } else {
        vm.rstack.push(vm.thread, vm.ip);
        vm.thread = xt.body;
        vm.ip = 0;
      }
    }
    return vm.ds;
  }

  return { dictionary, load, execute };
}

const forth = createForth();
forth.load(SOURCE);
const MAIN = forth.dictionary.get("main");

export function main(input) {
  return forth.execute(MAIN, [input.n | 0]);
}
export const inputs = [{ n: 0 }, { n: 1 }, { n: 2 }, { n: 3 }, { n: 12 }, { n: 100 }, { n: 180 }];
