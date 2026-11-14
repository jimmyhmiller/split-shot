// The machine of `interp_exception_branch_vm_recursion`, running a
// function that calls itself and asks how deep its calls are: a `depth`
// instruction pushes the length of the call stack. That length is a
// runtime value the residual needs, so the call stack cannot be the
// model's alone (`EntrySplit::open`): the length an open array gives is
// a token no code assigns, the residual naming it is a violation
// (`entry_conflicts`), and the pass is run again with the array runtime
// state from the boundary on, a frame pushed and popped around each call
// in a `try`, as before there were open arrays. The answers are the
// program's.
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
      case "depth": stack.push(this.calls.length); break;
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
  // f(n) = n === 0 ? depth : f(n - 1) + depth
  { params: 1, locals: 1, code: [
    I("get", 0), I("eqz"),
    I("if"),
    I("depth"), I("set", 1),
    I("else"),
    I("get", 0), I("const", 1), I("sub"), I("call", 0), I("depth"), I("add"), I("set", 1),
    I("end"),
    I("get", 1),
  ] },
  // run(n) = f(n & 7) + depth
  { params: 1, locals: 0, code: [
    I("get", 0), I("const", 7), I("and"), I("call", 0), I("depth"), I("add"),
  ] },
]);
export function main(input) {
  return MACHINE.call(1, [input.n | 0]);
}
