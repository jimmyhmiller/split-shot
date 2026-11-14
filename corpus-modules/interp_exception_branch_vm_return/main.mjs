// The machine of `interp_exception_branch_vm_recursion`, with a `ret`
// instruction that leaves the function by throwing, caught where the
// function was called. Euclid's algorithm: `if (b == 0) return a;` and
// then the call of itself, after the conditional, not inside it. The
// instruction function that ran the conditional branched at runtime and
// came back on the path that did not return; its caller, the block's
// loop, is then one that branched (see `Instr::Return`), though not under
// dynamic control itself, and neither is the activation it calls next,
// which makes the recursive call. That call is weighed for progress all
// the same (`do_call`, `PE_RECURSION_NEEDS_DYN_CTL`): it makes none and
// becomes a residual function. Not weighed, it was unfolded without end.
class Branch {
  constructor(depth) {
    this.depth = depth;
  }
}
class Return {
  constructor(value) {
    this.value = value;
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
    } catch (e) {
      if (e instanceof Return) return e.value;
      throw e;
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
      case "ret": throw new Return(stack.pop());
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
      case "rem": { const b = stack.pop() >>> 0, a = stack.pop() >>> 0; stack.push(b === 0 ? 0 : (a % b) | 0); break; }
      case "and": { const b = stack.pop(), a = stack.pop(); stack.push(a & b); break; }
      case "xor": { const b = stack.pop(), a = stack.pop(); stack.push(a ^ b); break; }
      case "ge": { const b = stack.pop(), a = stack.pop(); stack.push((a | 0) >= (b | 0) ? 1 : 0); break; }
      default: throw new Error("unknown instruction " + ins.op);
    }
  }
}
const I = (op, n) => ({ op, n });
const MACHINE = new Machine([
  // gcd(a, b) { if (b == 0) return a; return gcd(b, a % b); }
  { params: 2, locals: 0, code: [
    I("get", 1), I("eqz"),
    I("if"),
    I("get", 0), I("ret"),
    I("end"),
    I("get", 1), I("get", 0), I("get", 1), I("rem"), I("call", 0),
  ] },
  // run(n) = gcd(84, (n & 31) + 1)
  { params: 1, locals: 0, code: [
    I("const", 84), I("get", 0), I("const", 31), I("and"), I("const", 1), I("add"), I("call", 0),
  ] },
]);
export function main(input) {
  return MACHINE.call(1, [input.n | 0]);
}
