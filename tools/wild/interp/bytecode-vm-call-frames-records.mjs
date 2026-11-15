// style: bytecode VM (AST compiled at load to numeric bytecode with a constant pool; call frames pushed as {pc, fp, f}, f the callee's record, restored on return)
// residue: "(fib|collatz|half)"
const OP_CONST = 0, OP_LOAD = 1, OP_STORE = 2, OP_ADD = 3, OP_SUB = 4, OP_MUL = 5, OP_LT = 6, OP_JMP = 7, OP_JF = 8, OP_CALL = 9, OP_RET = 10, OP_EQ = 11, OP_MOD = 12, OP_POP = 13;
// The program, as an AST: functions with params and locals.
const FUNCS = {
  fib: { params: ["n"], body: ["if", ["<", ["var", "n"], ["num", 2]], ["return", ["var", "n"]],
         ["return", ["+", ["call", "fib", ["-", ["var", "n"], ["num", 1]]], ["call", "fib", ["-", ["var", "n"], ["num", 2]]]]]] },
  collatz: { params: ["n"], locals: ["steps"], body: ["seq",
      ["set", "steps", ["num", 0]],
      ["while", ["<", ["num", 1], ["var", "n"]], ["seq",
        ["if", ["==", ["%", ["var", "n"], ["num", 2]], ["num", 0]],
          ["set", "n", ["call", "half", ["var", "n"]]],
          ["set", "n", ["+", ["*", ["var", "n"], ["num", 3]], ["num", 1]]]],
        ["set", "steps", ["+", ["var", "steps"], ["num", 1]]]]],
      ["return", ["var", "steps"]]] },
  half: { params: ["x"], locals: ["r"], body: ["seq", ["set", "r", ["num", 0]],
      ["while", ["<", ["+", ["var", "r"], ["var", "r"]], ["var", "x"]], ["set", "r", ["+", ["var", "r"], ["num", 1]]]],
      ["return", ["var", "r"]]] },
};

function compileAll(funcs) {
  const code = [];
  const consts = [];
  const entry = {};
  const fixups = [];
  for (const name of Object.keys(funcs)) {
    const f = funcs[name];
    const slots = new Map();
    for (const p of f.params) slots.set(p, slots.size);
    for (const l of f.locals || []) slots.set(l, slots.size);
    entry[name] = { addr: code.length, nparams: f.params.length, nlocals: slots.size };
    const emit = (...xs) => { code.push(...xs); };
    const expr = (e) => {
      switch (e[0]) {
        case "num": { let k = consts.indexOf(e[1]); if (k < 0) { k = consts.length; consts.push(e[1]); } emit(OP_CONST, k); break; }
        case "var": emit(OP_LOAD, slots.get(e[1])); break;
        case "+": expr(e[1]); expr(e[2]); emit(OP_ADD); break;
        case "-": expr(e[1]); expr(e[2]); emit(OP_SUB); break;
        case "*": expr(e[1]); expr(e[2]); emit(OP_MUL); break;
        case "%": expr(e[1]); expr(e[2]); emit(OP_MOD); break;
        case "<": expr(e[1]); expr(e[2]); emit(OP_LT); break;
        case "==": expr(e[1]); expr(e[2]); emit(OP_EQ); break;
        case "call": for (const a of e.slice(2)) expr(a); emit(OP_CALL, 0); fixups.push([code.length - 1, e[1]]); break;
        default: throw new Error("bad expr " + e[0]);
      }
    };
    const stmt = (s) => {
      switch (s[0]) {
        case "seq": for (const x of s.slice(1)) stmt(x); break;
        case "set": expr(s[2]); emit(OP_STORE, slots.get(s[1])); break;
        case "return": expr(s[1]); emit(OP_RET); break;
        case "if": { expr(s[1]); emit(OP_JF, 0); const j = code.length - 1; stmt(s[2]); emit(OP_JMP, 0); const k = code.length - 1; code[j] = code.length; if (s[3]) stmt(s[3]); code[k] = code.length; break; }
        case "while": { const top = code.length; expr(s[1]); emit(OP_JF, 0); const j = code.length - 1; stmt(s[2]); emit(OP_JMP, top); code[j] = code.length; break; }
        default: throw new Error("bad stmt " + s[0]);
      }
    };
    stmt(f.body);
  }
  for (const [at, name] of fixups) code[at] = name;
  return { code, consts, entry };
}
const COMPILED = compileAll(FUNCS);

function execute({ code, consts, entry }, fname, args) {
  const stack = new Array(4096);
  let sp = 0;
  const frames = [];
  let f = entry[fname];
  let fp = 0;
  for (const a of args) stack[sp++] = a;
  sp = fp + f.nlocals;
  let pc = f.addr;
  for (;;) {
    const op = code[pc++];
    switch (op) {
      case OP_CONST: stack[sp++] = consts[code[pc++]]; break;
      case OP_LOAD: stack[sp++] = stack[fp + code[pc++]]; break;
      case OP_STORE: stack[fp + code[pc++]] = stack[--sp]; break;
      case OP_ADD: { const b = stack[--sp]; stack[sp - 1] = stack[sp - 1] + b; break; }
      case OP_SUB: { const b = stack[--sp]; stack[sp - 1] = stack[sp - 1] - b; break; }
      case OP_MUL: { const b = stack[--sp]; stack[sp - 1] = stack[sp - 1] * b; break; }
      case OP_MOD: { const b = stack[--sp]; stack[sp - 1] = stack[sp - 1] % b; break; }
      case OP_LT: { const b = stack[--sp]; stack[sp - 1] = stack[sp - 1] < b ? 1 : 0; break; }
      case OP_EQ: { const b = stack[--sp]; stack[sp - 1] = stack[sp - 1] === b ? 1 : 0; break; }
      case OP_JMP: pc = code[pc]; break;
      case OP_JF: { const t = code[pc++]; if (stack[--sp] === 0) pc = t; break; }
      case OP_CALL: {
        const callee = entry[code[pc++]];
        frames.push({ pc, fp, f });
        fp = sp - callee.nparams;
        f = callee;
        sp = fp + callee.nlocals;
        pc = callee.addr;
        break;
      }
      case OP_RET: {
        const v = stack[--sp];
        if (frames.length === 0) return v;
        sp = fp;
        ({ pc, fp, f } = frames.pop());
        stack[sp++] = v;
        break;
      }
      default: throw new Error("bad op " + op + " at " + (pc - 1));
    }
  }
}

export function main(input) {
  return { fib: execute(COMPILED, "fib", [input.n]), collatz: execute(COMPILED, "collatz", [input.c]) };
}
export const inputs = [{ n: 0, c: 1 }, { n: 1, c: 2 }, { n: 7, c: 27 }, { n: 15, c: 97 }, { n: 18, c: 871 }, { n: 10, c: 6171 }];
