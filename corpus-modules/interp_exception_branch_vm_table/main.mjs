// The machine of `interp_exception_branch_vm` with a branch table: `br_table`
// pops a runtime index and branches to the label its list has there, or
// to a default. What makes it compile:
// - `i >= 0 && i < labels.length` is one condition under the handlers'
//   `try` (`try_if_convert`), and a branch on the variable it is put in
//   learns both tests (`facts::Info::when_true`);
// - the index is an integer (`facts::Info::int`: it came out of `>>> 0`),
//   so within those bounds it is one of the list's indices, and
//   `labels[i]` is a case over them with no "none of them" left
//   (`trick_index`);
// - the label looked up, a different static number on each path, stays
//   so at the join in the instruction's handler (`consume_pending_joins`)
//   instead of becoming a runtime depth every enclosing block tests.
// The table compiles to the tests of the index, each arm the code after
// its block.
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
      case "br_table": {
        const i = stack.pop();
        const target = i >= 0 && i < ins.labels.length ? ins.labels[i] : ins.n;
        throw new Branch(target);
      }
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
      case "remu": { const b = stack.pop(), a = stack.pop(); stack.push((a >>> 0) % (b >>> 0) >>> 0); break; }
      case "ge": { const b = stack.pop(), a = stack.pop(); stack.push((a | 0) >= (b | 0) ? 1 : 0); break; }
      default: throw new Error("unknown instruction " + ins.op);
    }
  }
}
const I = (op, n) => ({ op, n });
const MACHINE = new Machine([
  // n % 3 == 0: 2n; == 1: -n; otherwise n * n
  { params: 1, locals: 1, code: [
    I("get", 0), I("get", 0), I("mul"), I("set", 1),
    I("block"), I("block"), I("block"),
    I("get", 0), I("const", 3), I("remu"), { op: "br_table", labels: [0, 1], n: 2 },
    I("end"),
    I("get", 0), I("const", 2), I("mul"), I("set", 1), I("br", 1),
    I("end"),
    I("const", 0), I("get", 0), I("sub"), I("set", 1), I("br", 0),
    I("end"),
    I("get", 1),
  ] },
]);
export function main(input) {
  return MACHINE.call(0, [input.n | 0]);
}
