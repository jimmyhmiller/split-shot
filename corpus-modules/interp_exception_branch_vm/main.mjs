// A structured stack machine written the way small WebAssembly
// interpreters often are: a branch is a thrown signal, every instruction
// runs in a `try` whose handler looks at it, a call is wrapped in
// `try`/`finally` around a call stack the machine keeps, and a block's
// instructions are copied out of its function's each time it is entered.
// What makes it compile:
// - the call stack is the load code's object, pushed and popped back to
//   what the boundary has (asked while it differs, it is only not
//   unchanged then: see `entry_unchanged`; a path's end is where it is
//   checked, a probe's is not);
// - the handlers throw again what runtime code raises, the `finally`'s
//   through the code after it (`rethrows_foreign`), so no runtime `try`;
// - the instruction counter is a captured variable's cell that indexes a
//   list of the load code's objects (`dispatch_fields`), and a place says
//   which list (`dispatch_point`);
// - the helpers that scan a block hold nothing dynamic, so their loops are
//   no loops of the program (`dynamically_controlled`);
// - the two arms of an `if` are two lists, kept as two paths at the join
//   (`consume_pending_joins`);
// - the machine's locals lifted at a loop head stay numbers
//   (`generalize_inner`), so `a + b` on them converts nothing.
class Branch {
  constructor(depth) {
    this.depth = depth;
  }
}
class Machine {
  constructor(funcs) {
    this.funcs = funcs;
    this.calls = [];
  }
  call(index, args) {
    const f = this.funcs[index];
    const locals = [...args];
    for (let i = 0; i < f.locals; i++) locals.push(0);
    this.calls.push({ index, locals });
    try {
      return this.block(f.code, locals, 1)[0];
    } finally {
      this.calls.pop();
    }
  }
  block(code, locals, results, loop = false) {
    const stack = [];
    let ip = 0;
    while (ip < code.length) {
      const ins = code[ip];
      ip++;
      try {
        this.step(ins, stack, locals, code, ip, (n) => { ip = n; });
      } catch (e) {
        if (e instanceof Branch) {
          if (e.depth === 0) {
            if (loop) {
              ip = 0;
              stack.length = 0;
              continue;
            }
            return [];
          }
          throw new Branch(e.depth - 1);
        }
        throw e;
      }
    }
    const out = [];
    for (let i = 0; i < results; i++) out.unshift(stack.pop());
    return out;
  }
  extract(code, start) {
    const body = [];
    let other = null;
    let into = body;
    let depth = 0;
    let ip = start;
    while (ip < code.length) {
      const ins = code[ip++];
      if (ins.op === "block" || ins.op === "loop" || ins.op === "if") {
        depth++;
        into.push(ins);
      } else if (ins.op === "else" && depth === 0) {
        other = [];
        into = other;
      } else if (ins.op === "end") {
        if (depth === 0) break;
        depth--;
        into.push(ins);
      } else {
        into.push(ins);
      }
    }
    return { body, other };
  }
  skip(code, start) {
    let depth = 0;
    let count = 0;
    for (let ip = start + 1; ip < code.length; ip++) {
      count++;
      const ins = code[ip];
      if (ins.op === "block" || ins.op === "loop" || ins.op === "if") depth++;
      else if (ins.op === "end") {
        if (depth === 0) return count;
        depth--;
      }
    }
    return count;
  }
  step(ins, stack, locals, code, ip, setIp) {
    switch (ins.op) {
      case "block":
      case "loop": {
        const { body } = this.extract(code, ip);
        setIp(ip + this.skip(code, ip - 1));
        for (const v of this.block(body, locals, 0, ins.op === "loop")) stack.push(v);
        break;
      }
      case "if": {
        const c = stack.pop();
        const { body, other } = this.extract(code, ip);
        setIp(ip + this.skip(code, ip - 1));
        const arm = c ? body : (other || []);
        for (const v of this.block(arm, locals, 0)) stack.push(v);
        break;
      }
      case "br": throw new Branch(ins.n);
      case "br_if": if (stack.pop()) throw new Branch(ins.n); break;
      case "call": {
        const args = [];
        for (let i = 0; i < this.funcs[ins.n].params; i++) args.unshift(stack.pop());
        stack.push(this.call(ins.n, args));
        break;
      }
      case "get": stack.push(locals[ins.n]); break;
      case "set": locals[ins.n] = stack.pop(); break;
      case "const": stack.push(ins.n | 0); break;
      case "eqz": stack.push(stack.pop() === 0 ? 1 : 0); break;
      case "add": { const b = stack.pop(), a = stack.pop(); stack.push((a + b) | 0); break; }
      case "sub": { const b = stack.pop(), a = stack.pop(); stack.push((a - b) | 0); break; }
      case "mul": { const b = stack.pop(), a = stack.pop(); stack.push(Math.imul(a, b)); break; }
      case "and": { const b = stack.pop(), a = stack.pop(); stack.push(a & b); break; }
      case "xor": { const b = stack.pop(), a = stack.pop(); stack.push(a ^ b); break; }
      case "ge": { const b = stack.pop(), a = stack.pop(); stack.push((a | 0) >= (b | 0) ? 1 : 0); break; }
      default: throw new Error("unknown instruction " + ins.op);
    }
  }
}
const I = (op, n) => ({ op, n });
const MACHINE = new Machine([
  // bits(x): the number of set bits of x
  { params: 1, locals: 1, code: [
    I("block"), I("loop"),
    I("get", 0), I("eqz"), I("br_if", 1),
    I("get", 0), I("get", 0), I("const", 1), I("sub"), I("and"), I("set", 0),
    I("get", 1), I("const", 1), I("add"), I("set", 1),
    I("br", 0),
    I("end"), I("end"),
    I("get", 1),
  ] },
  // mix(n): over i below n, h = h * 31 + i when bits(i) is odd, h ^ i otherwise
  { params: 1, locals: 2, code: [
    I("const", 7), I("set", 2),
    I("block"), I("loop"),
    I("get", 1), I("get", 0), I("ge"), I("br_if", 1),
    I("get", 1), I("call", 0), I("const", 1), I("and"),
    I("if"),
    I("get", 2), I("const", 31), I("mul"), I("get", 1), I("add"), I("set", 2),
    I("else"),
    I("get", 2), I("get", 1), I("xor"), I("set", 2),
    I("end"),
    I("get", 1), I("const", 1), I("add"), I("set", 1),
    I("br", 0),
    I("end"), I("end"),
    I("get", 2),
  ] },
]);
export function main(input) {
  return MACHINE.call(1, [input.n | 0]);
}
