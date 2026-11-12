// style: S-expression Lisp over nested arrays (eval/apply, closures, linked environment frames)
// residue: "(lambda|define|quote|begin)"
// A small Scheme (define, lambda, if, let, begin, quote, closures over linked
// frames) running a fixed program: fib n, a fold, a map and a filter over the
// input list.

// Symbols are strings, numbers are numbers, lists are arrays.
const PROGRAM = [
  ["define", "fib", ["lambda", ["n"],
    ["if", ["<", "n", 2], "n", ["+", ["fib", ["-", "n", 1]], ["fib", ["-", "n", 2]]]]]],
  ["define", "foldl", ["lambda", ["f", "acc", "xs"],
    ["if", ["null?", "xs"], "acc", ["foldl", "f", ["f", "acc", ["car", "xs"]], ["cdr", "xs"]]]]],
  ["define", "map", ["lambda", ["f", "xs"],
    ["if", ["null?", "xs"], ["quote", []], ["cons", ["f", ["car", "xs"]], ["map", "f", ["cdr", "xs"]]]]]],
  ["define", "filter", ["lambda", ["p", "xs"],
    ["if", ["null?", "xs"], ["quote", []],
      ["let", [["x", ["car", "xs"]], ["rest", ["filter", "p", ["cdr", "xs"]]]],
        ["if", ["p", "x"], ["cons", "x", "rest"], "rest"]]]]],
  ["define", "make-adder", ["lambda", ["k"], ["lambda", ["x"], ["+", "x", "k"]]]],
  ["define", "sum-squares", ["lambda", ["xs"],
    ["foldl", ["lambda", ["acc", "x"], ["+", "acc", ["*", "x", "x"]]], 0, "xs"]]],
  ["define", "run", ["lambda", ["n", "xs"],
    ["begin",
      ["define", "add-n", ["make-adder", "n"]],
      ["list",
        ["fib", "n"],
        ["sum-squares", "xs"],
        ["map", "add-n", "xs"],
        ["filter", ["lambda", ["x"], ["=", 0, ["remainder", "x", 2]]], "xs"]]]]],
];

class Env {
  constructor(params, args, outer) {
    this.vars = new Map();
    for (let i = 0; i < params.length; i++) this.vars.set(params[i], args[i]);
    this.outer = outer;
  }
  find(name) {
    let env = this;
    while (env !== null) {
      if (env.vars.has(name)) return env;
      env = env.outer;
    }
    throw new Error("unbound symbol: " + name);
  }
  lookup(name) {
    return this.find(name).vars.get(name);
  }
  define(name, value) {
    this.vars.set(name, value);
  }
}

class Procedure {
  constructor(params, body, env) {
    this.params = params;
    this.body = body;
    this.env = env;
  }
}

function truthy(v) {
  return v !== false;
}

const builtins = {
  "+": (...a) => a.reduce((x, y) => x + y, 0),
  "-": (a, b) => (b === undefined ? -a : a - b),
  "*": (...a) => a.reduce((x, y) => x * y, 1),
  "<": (a, b) => a < b,
  ">": (a, b) => a > b,
  "=": (a, b) => a === b,
  "remainder": (a, b) => a % b,
  "car": (xs) => {
    if (!Array.isArray(xs) || xs.length === 0) throw new Error("car: not a pair");
    return xs[0];
  },
  "cdr": (xs) => {
    if (!Array.isArray(xs) || xs.length === 0) throw new Error("cdr: not a pair");
    return xs.slice(1);
  },
  "cons": (x, xs) => [x].concat(xs),
  "null?": (xs) => Array.isArray(xs) && xs.length === 0,
  "list": (...a) => a,
};

function makeGlobalEnv() {
  const env = new Env([], [], null);
  for (const name of Object.keys(builtins)) env.define(name, builtins[name]);
  return env;
}

function evaluate(x, env) {
  for (;;) {
    if (typeof x === "string") return env.lookup(x);
    if (!Array.isArray(x)) return x;
    const op = x[0];
    if (op === "quote") return x[1];
    if (op === "if") {
      x = truthy(evaluate(x[1], env)) ? x[2] : x[3];
      continue;
    }
    if (op === "define") {
      env.define(x[1], evaluate(x[2], env));
      return undefined;
    }
    if (op === "lambda") return new Procedure(x[1], x[2], env);
    if (op === "begin") {
      for (let i = 1; i < x.length - 1; i++) evaluate(x[i], env);
      x = x[x.length - 1];
      continue;
    }
    if (op === "let") {
      const bindings = x[1];
      const names = bindings.map((b) => b[0]);
      const values = bindings.map((b) => evaluate(b[1], env));
      env = new Env(names, values, env);
      x = x[2];
      continue;
    }
    const proc = evaluate(op, env);
    const args = [];
    for (let i = 1; i < x.length; i++) args.push(evaluate(x[i], env));
    if (proc instanceof Procedure) {
      // Tail call: run the body in a new frame without growing the JS stack.
      env = new Env(proc.params, args, proc.env);
      x = proc.body;
      continue;
    }
    if (typeof proc === "function") return proc(...args);
    throw new Error("not a procedure: " + JSON.stringify(op));
  }
}

const globalEnv = makeGlobalEnv();
for (const form of PROGRAM) evaluate(form, globalEnv);

export function main(input) {
  const env = new Env(["input-n", "input-xs"], [input.n, input.xs], globalEnv);
  return evaluate(["run", "input-n", "input-xs"], env);
}

export const inputs = [
  { n: 0, xs: [] },
  { n: 1, xs: [1] },
  { n: 5, xs: [1, 2, 3, 4] },
  { n: 3, xs: [-1, 0.5, 7, 10] },
  { n: 10, xs: [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9] },
  { n: 11, xs: [2, 7, 1, 8, 2, 8, 1, 8, 2, 8, 4, 5, 9, 0, 4, 5, 2, 3, 5, 3, 6, 0, 2, 8, 7, 4, 7, 1, 3, 5] },
];
