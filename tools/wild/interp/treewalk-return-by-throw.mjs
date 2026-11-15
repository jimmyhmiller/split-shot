// style: tree-walking interpreter made per call in main, returning by throw (source parsed at load; Interpreter object and Environment chain over a Map made inside main; an interpreted return throws a ReturnSignal caught at the call)
// residue: "(BinOp|WhileStmt|IfStmt|CallExpr)"
class Environment {
  constructor(parent) { this.parent = parent; this.vars = new Map(); }
  define(name, v) { this.vars.set(name, v); }
  lookup(name) {
    let e = this;
    while (e) { if (e.vars.has(name)) return e.vars.get(name); e = e.parent; }
    throw new ReferenceError("undefined variable " + name);
  }
  assign(name, v) {
    let e = this;
    while (e) { if (e.vars.has(name)) { e.vars.set(name, v); return; } e = e.parent; }
    throw new ReferenceError("undefined variable " + name);
  }
}
class ReturnSignal { constructor(value) { this.value = value; } }

function tokenize(src) {
  const toks = [];
  const re = /\s*(?:(\d+)|([A-Za-z_]\w*)|(==|!=|<=|>=|&&|\|\||[-+*\/%<>=(){};,!]))/y;
  let m;
  while (re.lastIndex < src.length) {
    const start = re.lastIndex;
    m = re.exec(src);
    if (!m) { if (/^\s*$/.test(src.slice(start))) break; throw new SyntaxError("bad char at " + start); }
    if (m[1]) toks.push({ t: "num", v: Number(m[1]) });
    else if (m[2]) toks.push({ t: ["let", "fn", "if", "else", "while", "return"].includes(m[2]) ? m[2] : "id", v: m[2] });
    else toks.push({ t: m[3], v: m[3] });
  }
  toks.push({ t: "eof" });
  return toks;
}

class Parser {
  constructor(toks) { this.toks = toks; this.i = 0; }
  peek() { return this.toks[this.i]; }
  next() { return this.toks[this.i++]; }
  expect(t) { const k = this.next(); if (k.t !== t) throw new SyntaxError("expected " + t + " got " + k.t); return k; }
  program() { const body = []; while (this.peek().t !== "eof") body.push(this.statement()); return body; }
  block() { this.expect("{"); const body = []; while (this.peek().t !== "}") body.push(this.statement()); this.expect("}"); return body; }
  statement() {
    const t = this.peek().t;
    if (t === "let") { this.next(); const name = this.expect("id").v; this.expect("="); const init = this.expr(); this.expect(";"); return { type: "LetStmt", name, init }; }
    if (t === "fn") { this.next(); const name = this.expect("id").v; this.expect("("); const params = []; while (this.peek().t !== ")") { params.push(this.expect("id").v); if (this.peek().t === ",") this.next(); } this.expect(")"); const body = this.block(); return { type: "FnDecl", name, params, body }; }
    if (t === "if") { this.next(); this.expect("("); const test = this.expr(); this.expect(")"); const cons = this.block(); let alt = null; if (this.peek().t === "else") { this.next(); alt = this.block(); } return { type: "IfStmt", test, cons, alt }; }
    if (t === "while") { this.next(); this.expect("("); const test = this.expr(); this.expect(")"); const body = this.block(); return { type: "WhileStmt", test, body }; }
    if (t === "return") { this.next(); const arg = this.expr(); this.expect(";"); return { type: "ReturnStmt", arg }; }
    if (t === "id" && this.toks[this.i + 1].t === "=") { const name = this.next().v; this.next(); const value = this.expr(); this.expect(";"); return { type: "AssignStmt", name, value }; }
    const e = this.expr(); this.expect(";"); return { type: "ExprStmt", expr: e };
  }
  expr() { return this.binary(0); }
  binary(minPrec) {
    const PREC = { "||": 1, "&&": 2, "==": 3, "!=": 3, "<": 4, ">": 4, "<=": 4, ">=": 4, "+": 5, "-": 5, "*": 6, "/": 6, "%": 6 };
    let left = this.unary();
    for (;;) {
      const op = this.peek().t;
      const p = PREC[op];
      if (p === undefined || p < minPrec) return left;
      this.next();
      const right = this.binary(p + 1);
      left = { type: "BinOp", op, left, right };
    }
  }
  unary() {
    if (this.peek().t === "-") { this.next(); return { type: "BinOp", op: "-", left: { type: "Num", value: 0 }, right: this.unary() }; }
    if (this.peek().t === "!") { this.next(); return { type: "Not", arg: this.unary() }; }
    return this.call();
  }
  call() {
    let e = this.primary();
    while (this.peek().t === "(") {
      this.next(); const args = [];
      while (this.peek().t !== ")") { args.push(this.expr()); if (this.peek().t === ",") this.next(); }
      this.expect(")");
      e = { type: "CallExpr", callee: e, args };
    }
    return e;
  }
  primary() {
    const k = this.next();
    if (k.t === "num") return { type: "Num", value: k.v };
    if (k.t === "id") return { type: "Var", name: k.v };
    if (k.t === "(") { const e = this.expr(); this.expect(")"); return e; }
    throw new SyntaxError("unexpected " + k.t);
  }
}

class Interpreter {
  constructor() { this.globals = new Environment(null); }
  execBlock(stmts, env) { for (const s of stmts) this.exec(s, env); }
  exec(s, env) {
    switch (s.type) {
      case "LetStmt": env.define(s.name, this.eval(s.init, env)); break;
      case "AssignStmt": env.assign(s.name, this.eval(s.value, env)); break;
      case "FnDecl": env.define(s.name, { params: s.params, body: s.body, closure: env }); break;
      case "IfStmt":
        if (this.truthy(this.eval(s.test, env))) this.execBlock(s.cons, new Environment(env));
        else if (s.alt) this.execBlock(s.alt, new Environment(env));
        break;
      case "WhileStmt":
        while (this.truthy(this.eval(s.test, env))) this.execBlock(s.body, new Environment(env));
        break;
      case "ReturnStmt": throw new ReturnSignal(this.eval(s.arg, env));
      case "ExprStmt": this.eval(s.expr, env); break;
      default: throw new Error("unknown stmt " + s.type);
    }
  }
  truthy(v) { return v !== 0 && v !== false && v !== null; }
  eval(e, env) {
    switch (e.type) {
      case "Num": return e.value;
      case "Var": return env.lookup(e.name);
      case "Not": return !this.truthy(this.eval(e.arg, env));
      case "BinOp": {
        if (e.op === "&&") { const l = this.eval(e.left, env); return this.truthy(l) ? this.eval(e.right, env) : l; }
        if (e.op === "||") { const l = this.eval(e.left, env); return this.truthy(l) ? l : this.eval(e.right, env); }
        const a = this.eval(e.left, env), b = this.eval(e.right, env);
        switch (e.op) {
          case "+": return a + b; case "-": return a - b; case "*": return a * b;
          case "/": if (b === 0) throw new RangeError("division by zero"); return Math.trunc(a / b);
          case "%": return a % b;
          case "<": return a < b; case ">": return a > b; case "<=": return a <= b; case ">=": return a >= b;
          case "==": return a === b; case "!=": return a !== b;
        }
        throw new Error("bad op " + e.op);
      }
      case "CallExpr": {
        const fn = this.eval(e.callee, env);
        const args = e.args.map((a) => this.eval(a, env));
        if (typeof fn === "function") return fn(...args);
        const callEnv = new Environment(fn.closure);
        fn.params.forEach((p, i) => callEnv.define(p, args[i]));
        try { this.execBlock(fn.body, callEnv); } catch (sig) { if (sig instanceof ReturnSignal) return sig.value; throw sig; }
        return null;
      }
      default: throw new Error("unknown expr " + e.type);
    }
  }
}

const SOURCE = `
fn fib(n) { if (n < 2) { return n; } return fib(n - 1) + fib(n - 2); }
fn sumTo(n) { let s = 0; let i = 0; while (i < n) { if (i % 3 == 0 || i % 5 == 0) { s = s + i; } i = i + 1; } return s; }
fn gcd(a, b) { while (b != 0) { let t = b; b = a % b; a = t; } return a; }
`;
const AST = new Parser(tokenize(SOURCE)).program();

export function main(input) {
  const interp = new Interpreter();
  interp.globals.define("n", input.n);
  interp.globals.define("m", input.m);
  interp.execBlock(AST, interp.globals);
  const call = (name, ...args) => interp.eval({ type: "CallExpr", callee: { type: "Var", name }, args: args.map((v) => ({ type: "Num", value: v })) }, interp.globals);
  return [call("fib", input.n), call("sumTo", input.m), call("gcd", input.m, input.n + 1)];
}
export const inputs = [{ n: 0, m: 0 }, { n: 1, m: 1 }, { n: 5, m: 10 }, { n: 10, m: 100 }, { n: 15, m: 1000 }, { n: 12, m: 333 }];
