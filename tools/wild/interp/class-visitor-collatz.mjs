// style: class-per-node AST with accept(visitor) double dispatch (OO visitor pattern)
// residue: \b(visitNumber|visitVariable|visitBinary|visitIf|visitCall|visitLet|NumberNode|VariableNode|BinaryNode|IfNode|CallNode|LetNode)\b
// An expression language with recursive functions, as a class hierarchy of
// nodes walked by an Evaluator visitor: the total Collatz length of 1..m and the
// longest chain's start, by mutually recursive functions.

class Node {
  accept(visitor, env) {
    throw new Error("accept not implemented for " + this.constructor.name);
  }
}
class NumberNode extends Node {
  constructor(value) { super(); this.value = value; }
  accept(visitor, env) { return visitor.visitNumber(this, env); }
}
class VariableNode extends Node {
  constructor(name) { super(); this.name = name; }
  accept(visitor, env) { return visitor.visitVariable(this, env); }
}
class BinaryNode extends Node {
  constructor(op, left, right) { super(); this.op = op; this.left = left; this.right = right; }
  accept(visitor, env) { return visitor.visitBinary(this, env); }
}
class IfNode extends Node {
  constructor(cond, then, otherwise) { super(); this.cond = cond; this.then = then; this.otherwise = otherwise; }
  accept(visitor, env) { return visitor.visitIf(this, env); }
}
class CallNode extends Node {
  constructor(callee, args) { super(); this.callee = callee; this.args = args; }
  accept(visitor, env) { return visitor.visitCall(this, env); }
}
class LetNode extends Node {
  constructor(name, value, body) { super(); this.name = name; this.value = value; this.body = body; }
  accept(visitor, env) { return visitor.visitLet(this, env); }
}
class FunctionDef {
  constructor(name, params, body) { this.name = name; this.params = params; this.body = body; }
}
class Program {
  constructor(functions, entry) {
    this.functions = new Map(functions.map((f) => [f.name, f]));
    this.entry = entry;
  }
}

class Scope {
  constructor(bindings, parent) { this.bindings = bindings; this.parent = parent; }
  get(name) {
    for (let s = this; s; s = s.parent) {
      if (Object.prototype.hasOwnProperty.call(s.bindings, name)) return s.bindings[name];
    }
    throw new ReferenceError(`unbound variable '${name}'`);
  }
}

class Evaluator {
  constructor(program) {
    this.program = program;
    this.depth = 0;
  }
  run(args) {
    return this.callFunction(this.program.entry, args);
  }
  callFunction(name, args) {
    const fn = this.program.functions.get(name);
    if (!fn) throw new ReferenceError(`unknown function '${name}'`);
    if (fn.params.length !== args.length) throw new TypeError(`${name} expects ${fn.params.length} arguments`);
    const bindings = {};
    fn.params.forEach((p, i) => { bindings[p] = args[i]; });
    if (++this.depth > 1000) throw new RangeError("call depth exceeded");
    try {
      return fn.body.accept(this, new Scope(bindings, null));
    } finally {
      this.depth--;
    }
  }
  visitNumber(node) { return node.value; }
  visitVariable(node, env) { return env.get(node.name); }
  visitBinary(node, env) {
    const a = node.left.accept(this, env);
    const b = node.right.accept(this, env);
    switch (node.op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return Math.trunc(a / b);
      case "%": return a % b;
      case "<": return a < b;
      case "==": return a === b;
      case "max": return a > b ? a : b;
      default: throw new Error(`bad operator ${node.op}`);
    }
  }
  visitIf(node, env) {
    return node.cond.accept(this, env) ? node.then.accept(this, env) : node.otherwise.accept(this, env);
  }
  visitCall(node, env) {
    return this.callFunction(node.callee, node.args.map((a) => a.accept(this, env)));
  }
  visitLet(node, env) {
    return node.body.accept(this, new Scope({ [node.name]: node.value.accept(this, env) }, env));
  }
}

const n = (v) => new NumberNode(v);
const v = (name) => new VariableNode(name);
const op = (o, a, b) => new BinaryNode(o, a, b);
const call = (f, ...args) => new CallNode(f, args);

// fun step(k) = if k % 2 == 0 then k / 2 else 3 * k + 1
// fun len(k) = if k == 1 then 1 else 1 + len(step(k))
// fun scan(k, m, total, best, bestAt) =
//   if m < k then [total, bestAt]   -- encoded as total * 100000 + bestAt
//   else let l = len(k) in
//        if best < l then scan(k + 1, m, total + l, l, k) else scan(k + 1, m, total + l, best, bestAt)
// fun main(m) = scan(1, m, 0, 0, 0)
const PROGRAM = new Program([
  new FunctionDef("step", ["k"],
    new IfNode(op("==", op("%", v("k"), n(2)), n(0)), op("/", v("k"), n(2)), op("+", op("*", n(3), v("k")), n(1)))),
  new FunctionDef("len", ["k"],
    new IfNode(op("==", v("k"), n(1)), n(1), op("+", n(1), call("len", call("step", v("k")))))),
  new FunctionDef("scan", ["k", "m", "total", "best", "bestAt"],
    new IfNode(op("<", v("m"), v("k")),
      op("+", op("*", v("total"), n(100000)), v("bestAt")),
      new LetNode("l", call("len", v("k")),
        new IfNode(op("<", v("best"), v("l")),
          call("scan", op("+", v("k"), n(1)), v("m"), op("+", v("total"), v("l")), v("l"), v("k")),
          call("scan", op("+", v("k"), n(1)), v("m"), op("+", v("total"), v("l")), v("best"), v("bestAt")))))),
  new FunctionDef("main", ["m"], call("scan", n(1), v("m"), n(0), n(0), n(0))),
], "main");

export function main(input) {
  const ev = new Evaluator(PROGRAM);
  try {
    return { ok: ev.run([input.m]) };
  } catch (e) {
    return { error: e.name + ": " + e.message };
  }
}

export const inputs = [{ m: 0 }, { m: 1 }, { m: 3 }, { m: 10 }, { m: 27 }, { m: 45 }];
