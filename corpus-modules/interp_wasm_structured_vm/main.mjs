// A WebAssembly-like structured stack VM (see
// tools/wild/interp/wasm-structured-vm.mjs, which this is): its program
// counter a captured variable's cell, a label stack per activation, calls
// between the module's functions. The call of another function index is a
// residual function specialized to that index, whose result its caller
// knows as a new array of one length (see `result_arrays`), so
// `for (const r of results) stack.push(r)` leaves the operand stack
// modeled; `stack.splice(...)` for the arguments folds at a place of the
// program (`PE_NO_PLACE_BUILTINS`), and the self-hosted `splice`'s own loop
// is no place met again at its next call (`dynamically_controlled`).
const MODULE = {
  funcs: [
    {
      name: "popcount",
      params: 1, locals: 1, results: 1,
      body: [
        ["block"],
        ["loop"],
        ["local.get", 0], ["i32.eqz"], ["br_if", 1],
        ["local.get", 0], ["local.get", 0], ["i32.const", 1], ["i32.sub"], ["i32.and"], ["local.set", 0],
        ["local.get", 1], ["i32.const", 1], ["i32.add"], ["local.set", 1],
        ["br", 0],
        ["end"],
        ["end"],
        ["local.get", 1],
      ],
    },
    {
      name: "hash",
      params: 1, locals: 3, results: 1, // n; i, h, bits
      body: [
        ["i32.const", -2128831035], ["local.set", 2],
        ["block"],
        ["loop"],
        ["local.get", 1], ["local.get", 0], ["i32.ge_s"], ["br_if", 1],
        // h = rotl(h ^ i, 5) * 0x9E3779B1
        ["local.get", 2], ["local.get", 1], ["i32.xor"], ["i32.const", 5], ["i32.rotl"],
        ["i32.const", -1640531535], ["i32.mul"], ["local.set", 2],
        // bits = popcount(i); an odd count folds i into h, an even one mixes h
        ["local.get", 1], ["call", 0], ["local.tee", 3],
        ["i32.const", 1], ["i32.and"],
        ["if"],
        ["local.get", 2], ["local.get", 1], ["i32.const", 16], ["i32.shl"], ["i32.add"], ["local.set", 2],
        ["else"],
        ["local.get", 2], ["i32.const", 13], ["i32.shr_u"], ["local.get", 2], ["i32.xor"], ["local.set", 2],
        ["end"],
        ["local.get", 1], ["i32.const", 1], ["i32.add"], ["local.set", 1],
        ["br", 0],
        ["end"],
        ["end"],
        ["local.get", 2], ["local.get", 3], ["i32.xor"],
      ],
    },
  ],
};

function prepare(module) {
  return module.funcs.map((f) => {
    const ends = new Map();
    const elses = new Map();
    const open = [];
    f.body.forEach(([op], pc) => {
      if (op === "block" || op === "loop" || op === "if") open.push(pc);
      else if (op === "else") elses.set(open[open.length - 1], pc);
      else if (op === "end") {
        if (open.length === 0) throw new Error(f.name + ": unbalanced end at " + pc);
        ends.set(open.pop(), pc);
      }
    });
    if (open.length !== 0) throw new Error(f.name + ": missing end");
    return { ...f, ends, elses };
  });
}

const FUNCS = prepare(MODULE);

function invoke(funcs, index, args) {
  const f = funcs[index];
  const locals = new Int32Array(f.params + f.locals);
  for (let k = 0; k < f.params; k++) locals[k] = args[k];
  const stack = [];
  const labels = []; // { loop, target, height }
  const body = f.body;
  let pc = 0;
  const branch = (depth) => {
    const label = labels[labels.length - 1 - depth];
    labels.length -= depth;
    stack.length = label.height;
    if (label.loop) {
      pc = label.target + 1;
    } else {
      labels.pop();
      pc = label.target + 1;
    }
  };
  while (pc < body.length) {
    const ins = body[pc];
    switch (ins[0]) {
      case "block": labels.push({ loop: false, target: f.ends.get(pc), height: stack.length }); pc++; break;
      case "loop": labels.push({ loop: true, target: pc, height: stack.length }); pc++; break;
      case "if": {
        const cond = stack.pop();
        const end = f.ends.get(pc);
        labels.push({ loop: false, target: end, height: stack.length });
        if (cond !== 0) pc++;
        else if (f.elses.has(pc)) pc = f.elses.get(pc) + 1;
        else { labels.pop(); pc = end + 1; }
        break;
      }
      case "else": { const label = labels.pop(); pc = label.target + 1; break; }
      case "end": labels.pop(); pc++; break;
      case "br": branch(ins[1]); break;
      case "br_if": if (stack.pop() !== 0) branch(ins[1]); else pc++; break;
      case "return": pc = body.length; break;
      case "call": {
        const callee = funcs[ins[1]];
        const args = stack.splice(stack.length - callee.params, callee.params);
        const results = invoke(funcs, ins[1], args);
        for (const r of results) stack.push(r);
        pc++;
        break;
      }
      case "local.get": stack.push(locals[ins[1]]); pc++; break;
      case "local.set": locals[ins[1]] = stack.pop(); pc++; break;
      case "local.tee": locals[ins[1]] = stack[stack.length - 1]; pc++; break;
      case "i32.const": stack.push(ins[1] | 0); pc++; break;
      case "i32.eqz": stack.push(stack.pop() === 0 ? 1 : 0); pc++; break;
      default: {
        const b = stack.pop(), a = stack.pop();
        let r;
        switch (ins[0]) {
          case "i32.add": r = (a + b) | 0; break;
          case "i32.sub": r = (a - b) | 0; break;
          case "i32.mul": r = Math.imul(a, b); break;
          case "i32.and": r = a & b; break;
          case "i32.or": r = a | b; break;
          case "i32.xor": r = a ^ b; break;
          case "i32.shl": r = a << (b & 31); break;
          case "i32.shr_u": r = (a >>> (b & 31)) | 0; break;
          case "i32.shr_s": r = a >> (b & 31); break;
          case "i32.rotl": { const s = b & 31; r = (a << s) | (a >>> ((32 - s) & 31)); break; }
          case "i32.eq": r = a === b ? 1 : 0; break;
          case "i32.ne": r = a !== b ? 1 : 0; break;
          case "i32.lt_s": r = a < b ? 1 : 0; break;
          case "i32.ge_s": r = a >= b ? 1 : 0; break;
          case "i32.lt_u": r = (a >>> 0) < (b >>> 0) ? 1 : 0; break;
          default: throw new Error("unknown instruction " + ins[0]);
        }
        stack.push(r);
        pc++;
      }
    }
  }
  return stack.slice(stack.length - f.results);
}

export function main(input) {
  const [h] = invoke(FUNCS, 1, [input.n | 0]);
  return h;
}
