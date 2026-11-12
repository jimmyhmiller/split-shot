// style: lexical addressing (names resolved to (depth, index) in a pre-pass; frames are arrays)
// residue: "(LocalRef|GlobalRef|Const|MakeClosure|Apply|Branch|PrimOp)"
// A small Scheme whose variables are resolved before running: each reference
// becomes a (depth, index) pair into a chain of array frames, or a global slot.
// The fixed program: Takeuchi's tak, plus a composed closure iterated ten times.

const SOURCE = [
  ["define", ["tak", "x", "y", "z"],
    ["if", ["<", "y", "x"],
      ["tak", ["tak", ["-", "x", 1], "y", "z"], ["tak", ["-", "y", 1], "z", "x"], ["tak", ["-", "z", 1], "x", "y"]],
      "z"]],
  ["define", ["compose", "f", "g"], ["lambda", ["v"], ["f", ["g", "v"]]]],
  ["define", ["iterate", "f", "n", "v"], ["if", ["=", "n", 0], "v", ["iterate", "f", ["-", "n", 1], ["f", "v"]]]],
  ["define", ["main", "x", "y", "z"],
    ["let", [["step", ["compose", ["lambda", ["a"], ["+", "a", 1]], ["lambda", ["b"], ["*", "b", 2]]]]],
      ["+", ["tak", "x", "y", "z"], ["iterate", "step", 10, "x"]]]],
];

const PRIMS = {
  "+": (a, b) => a + b,
  "-": (a, b) => a - b,
  "*": (a, b) => a * b,
  "<": (a, b) => a < b,
  "=": (a, b) => a === b,
};

// ---- the resolver: names to addresses ----

class Globals {
  constructor() { this.names = []; this.values = []; }
  slot(name) {
    let i = this.names.indexOf(name);
    if (i < 0) { i = this.names.length; this.names.push(name); this.values.push(undefined); }
    return i;
  }
}

// scope: { vars: [names], parent } or null for the top level
function resolve(x, scope, globals) {
  if (typeof x === "number") return { op: "Const", value: x };
  if (typeof x === "string") {
    let depth = 0;
    for (let s = scope; s !== null; s = s.parent, depth++) {
      const index = s.vars.indexOf(x);
      if (index >= 0) return { op: "LocalRef", depth, index };
    }
    return { op: "GlobalRef", slot: globals.slot(x), name: x };
  }
  const head = x[0];
  if (head === "if") {
    return { op: "Branch", test: resolve(x[1], scope, globals), then: resolve(x[2], scope, globals), otherwise: resolve(x[3], scope, globals) };
  }
  if (head === "lambda") {
    return { op: "MakeClosure", arity: x[1].length, body: resolve(x[2], { vars: x[1], parent: scope }, globals) };
  }
  if (head === "let") {
    // (let ((n e) ...) body) is ((lambda (n ...) body) e ...)
    const names = x[1].map((b) => b[0]);
    const inits = x[1].map((b) => b[1]);
    return resolve([["lambda", names, x[2]], ...inits], scope, globals);
  }
  if (typeof head === "string" && Object.prototype.hasOwnProperty.call(PRIMS, head) && !isBound(head, scope)) {
    return { op: "PrimOp", fn: PRIMS[head], name: head, args: x.slice(1).map((a) => resolve(a, scope, globals)) };
  }
  return { op: "Apply", fn: resolve(head, scope, globals), args: x.slice(1).map((a) => resolve(a, scope, globals)) };
}

function isBound(name, scope) {
  for (let s = scope; s !== null; s = s.parent) if (s.vars.includes(name)) return true;
  return false;
}

function load(source) {
  const globals = new Globals();
  const defs = [];
  for (const form of source) {
    if (form[0] !== "define") throw new Error("only definitions at top level");
    const [name, ...params] = form[1];
    defs.push({ slot: globals.slot(name), lambda: { op: "MakeClosure", arity: params.length, body: resolve(form[2], { vars: params, parent: null }, globals) } });
  }
  for (const d of defs) globals.values[d.slot] = new Closure(d.lambda.arity, d.lambda.body, null);
  for (let i = 0; i < globals.names.length; i++) {
    if (globals.values[i] === undefined) throw new ReferenceError("undefined global " + globals.names[i]);
  }
  return globals;
}

// ---- the evaluator over resolved code ----

class Closure {
  constructor(arity, body, env) { this.arity = arity; this.body = body; this.env = env; }
}
// env: { slots: [...], up } or null

function exec(node, env, globals) {
  for (;;) {
    switch (node.op) {
      case "Const":
        return node.value;
      case "LocalRef": {
        let e = env;
        for (let d = node.depth; d > 0; d--) e = e.up;
        return e.slots[node.index];
      }
      case "GlobalRef":
        return globals.values[node.slot];
      case "Branch":
        node = exec(node.test, env, globals) ? node.then : node.otherwise;
        continue;
      case "MakeClosure":
        return new Closure(node.arity, node.body, env);
      case "PrimOp": {
        const a = node.args;
        return a.length === 2 ? node.fn(exec(a[0], env, globals), exec(a[1], env, globals)) : node.fn(...a.map((n) => exec(n, env, globals)));
      }
      case "Apply": {
        const fn = exec(node.fn, env, globals);
        if (!(fn instanceof Closure)) throw new TypeError("not a procedure");
        if (fn.arity !== node.args.length) throw new TypeError("wrong number of arguments");
        const slots = new Array(node.args.length);
        for (let i = 0; i < slots.length; i++) slots[i] = exec(node.args[i], env, globals);
        env = { slots, up: fn.env };
        node = fn.body;
        continue;
      }
      default:
        throw new Error("unknown op " + node.op);
    }
  }
}

const GLOBALS = load(SOURCE);
const MAIN = GLOBALS.values[GLOBALS.names.indexOf("main")];

export function main(input) {
  return exec(MAIN.body, { slots: [input.x, input.y, input.z], up: null }, GLOBALS);
}

export const inputs = [
  { x: 0, y: 0, z: 0 },
  { x: 3, y: 2, z: 1 },
  { x: 1, y: 2, z: 3 },
  { x: 6, y: 4, z: 2 },
  { x: 9, y: 6, z: 3 },
  { x: 11, y: 7, z: 4 },
  { x: 10, y: 7, z: 3 },
];
