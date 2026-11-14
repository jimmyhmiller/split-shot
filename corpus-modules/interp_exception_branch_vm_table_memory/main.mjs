// The machine of `interp_exception_branch_vm_recursion`, with a memory
// read and written through a `DataView` made at each access, a bounds
// check that traps, and a call through a table of function indices. The
// program stores a function pointer in memory, loads it back and calls
// through it.
//
// What the load gives is `view.getInt32(at, true)` of a view the standard
// `DataView` made: an integer (`view_read_info`). Once the call has
// checked it against the table's bounds it is one of the table's
// indices, and the table read is a case on it, the function called known
// in each (`trick_index`); taken for a value of any kind, the table was
// read at runtime and the function called interpreted.
class Branch {
  constructor(depth) {
    this.depth = depth;
  }
}
class Trap extends Error {}
class Machine {
  constructor(funcs, table) {
    this.funcs = funcs;
    this.table = table;
    this.memory = new ArrayBuffer(64);
    this.calls = [];
  }
  check(at, size) {
    if (!this.memory) throw new Trap("no memory");
    if (at < 0 || at + size > this.memory.byteLength) throw new Trap("out of bounds");
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
      case "load": { const at = stack.pop(); this.check(at, 4); stack.push(new DataView(this.memory).getInt32(at, true)); break; }
      case "store": { const v = stack.pop(), at = stack.pop(); this.check(at, 4); new DataView(this.memory).setInt32(at, v, true); break; }
      case "calli": {
        const at = stack.pop();
        if (!this.table || at < 0 || at >= this.table.length) throw new Trap("undefined element");
        const index = this.table[at];
        if (index === null || index === undefined) throw new Trap("uninitialized element");
        const args = [];
        for (let i = 0; i < this.funcs[index].params; i++) args.unshift(stack.pop());
        stack.push(this.call(index, args));
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
  // double(x) = x + x
  { params: 1, locals: 0, code: [I("get", 0), I("get", 0), I("add")] },
  // square(x) = x * x
  { params: 1, locals: 0, code: [I("get", 0), I("get", 0), I("mul")] },
  // negate(x) = 0 - x
  { params: 1, locals: 0, code: [I("const", 0), I("get", 0), I("sub")] },
  // run(n): m[8] = n & 3; return table[m[8]](n) + m[n]   (m[n] traps out of bounds)
  { params: 1, locals: 0, code: [
    I("const", 8), I("get", 0), I("const", 3), I("and"), I("store"),
    I("get", 0), I("const", 8), I("load"), I("calli"),
    I("get", 0), I("load"), I("add"),
  ] },
], [0, 1, 2]);
export function main(input) {
  try {
    return MACHINE.call(3, [input.n | 0]);
  } catch (e) {
    return e instanceof Trap ? "trap: " + e.message : "error";
  }
}
