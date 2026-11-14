// The machine of `interp_exception_branch_vm_recursion`, running
// Ackermann's function: two arguments, a conditional inside a
// conditional, and a call whose argument is another call. The first
// argument is known where the entry calls it (2) and a runtime value where
// it calls itself (read back from the frame the runtime call stack
// holds); the second is the other way about. `[2, x]` and `[y, 1]` are
// the same list of numbers, known in different places: no progress
// through the program (`skel_progress`, `skel_same_but_numbers`), so the
// call stalls and becomes a residual function of the two numbers. Taken
// for progress, the function was unfolded again and the stall fell to
// the interpreter's own block and instruction functions, residual
// functions of which keep the interpreter.
// (And a residual function's record arguments, held past every address a
// path allocates, are objects a conditional's two arms both had from the
// start: `made_since`. Taken for objects an arm made, they were dropped
// where the arms were made one, a reference to one left dangling.)
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
  // ack(m, n) = m === 0 ? n + 1 : n === 0 ? ack(m - 1, 1) : ack(m - 1, ack(m, n - 1))
  { params: 2, locals: 1, code: [
    I("get", 0), I("eqz"),
    I("if"),
    I("get", 1), I("const", 1), I("add"), I("set", 2),
    I("else"),
    I("get", 1), I("eqz"),
    I("if"),
    I("get", 0), I("const", 1), I("sub"), I("const", 1), I("call", 0), I("set", 2),
    I("else"),
    I("get", 0), I("const", 1), I("sub"),
    I("get", 0), I("get", 1), I("const", 1), I("sub"), I("call", 0),
    I("call", 0), I("set", 2),
    I("end"),
    I("end"),
    I("get", 2),
  ] },
  // run(n) = ack(2, n & 3)
  { params: 1, locals: 0, code: [
    I("const", 2), I("get", 0), I("const", 3), I("and"), I("call", 0),
  ] },
]);
export function main(input) {
  return MACHINE.call(1, [input.n | 0]);
}
