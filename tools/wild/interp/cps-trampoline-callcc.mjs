// style: continuation-passing evaluator with a trampoline (thunks bounce to a driver loop; call/cc is free)
// residue: "(Lit|Var|Lam|App|If|Prim|Letrec|CallCC)"
// A call-by-value lambda language with letrec and call/cc, evaluated in CPS:
// every step returns a thunk to a driver loop, so deep non-tail recursion does
// not grow the JS stack. The fixed program sums 1..n by non-tail recursion,
// and finds the product of a list, escaping with call/cc at the first zero.

const Lit = (value) => ({ tag: "Lit", value });
const Var = (name) => ({ tag: "Var", name });
const Lam = (params, body) => ({ tag: "Lam", params, body });
const App = (fn, ...args) => ({ tag: "App", fn, args });
const If = (test, then, otherwise) => ({ tag: "If", test, then, otherwise });
const Prim = (op, ...args) => ({ tag: "Prim", op, args });
const Letrec = (bindings, body) => ({ tag: "Letrec", bindings, body });
const CallCC = (fn) => ({ tag: "CallCC", fn });

// letrec sum = \n. if n == 0 then 0 else n + sum(n - 1)
//        prodList = \xs. callcc (\k.
//          letrec go = \ys. if null?(ys) then 1
//                           else if head(ys) == 0 then k(0)
//                           else head(ys) * go(tail(ys))
//          in go(xs))
// in pair(sum(n), prodList(xs))
const PROGRAM = Letrec(
  [
    ["sum", Lam(["n"],
      If(Prim("==", Var("n"), Lit(0)),
        Lit(0),
        Prim("+", Var("n"), App(Var("sum"), Prim("-", Var("n"), Lit(1))))))],
    ["prodList", Lam(["xs"],
      CallCC(Lam(["k"],
        Letrec(
          [["go", Lam(["ys"],
            If(Prim("null?", Var("ys")),
              Lit(1),
              If(Prim("==", Prim("head", Var("ys")), Lit(0)),
                App(Var("k"), Lit(0)),
                Prim("*", Prim("head", Var("ys")), App(Var("go"), Prim("tail", Var("ys")))))))]],
          App(Var("go"), Var("xs"))))))],
  ],
  Prim("pair", App(Var("sum"), Var("n")), App(Var("prodList"), Var("xs"))),
);

class Closure {
  constructor(params, body, env) { this.params = params; this.body = body; this.env = env; }
}
class Continuation {
  constructor(k) { this.k = k; }
}

function extend(env, names, values) {
  const frame = new Map();
  for (let i = 0; i < names.length; i++) frame.set(names[i], values[i]);
  return { frame, parent: env };
}
function lookup(env, name) {
  for (let e = env; e !== null; e = e.parent) {
    if (e.frame.has(name)) return e.frame.get(name);
  }
  throw new ReferenceError("unbound variable " + name);
}

const PRIMS = {
  "+": (a, b) => a + b,
  "-": (a, b) => a - b,
  "*": (a, b) => a * b,
  "==": (a, b) => a === b,
  "null?": (xs) => xs === null,
  "head": (xs) => xs.head,
  "tail": (xs) => xs.tail,
  "pair": (a, b) => [a, b],
};

// Evaluate a list of expressions left to right, then hand the values to k.
function evalList(exprs, env, i, acc, k) {
  if (i === exprs.length) return () => k(acc);
  return evaluate(exprs[i], env, (v) => evalList(exprs, env, i + 1, acc.concat([v]), k));
}

function applyProc(fn, args, k) {
  if (fn instanceof Closure) {
    if (fn.params.length !== args.length) throw new TypeError("arity mismatch");
    return () => evaluate(fn.body, extend(fn.env, fn.params, args), k);
  }
  if (fn instanceof Continuation) {
    // Throw away k: continue with the captured one.
    return () => fn.k(args[0]);
  }
  throw new TypeError("not a function");
}

function evaluate(node, env, k) {
  switch (node.tag) {
    case "Lit":
      return () => k(node.value);
    case "Var":
      return () => k(lookup(env, node.name));
    case "Lam":
      return () => k(new Closure(node.params, node.body, env));
    case "If":
      return evaluate(node.test, env, (t) => evaluate(t ? node.then : node.otherwise, env, k));
    case "Prim": {
      const f = PRIMS[node.op];
      if (!f) throw new Error("unknown primitive " + node.op);
      return evalList(node.args, env, 0, [], (vals) => () => k(f(...vals)));
    }
    case "App":
      return evaluate(node.fn, env, (fn) => evalList(node.args, env, 0, [], (args) => applyProc(fn, args, k)));
    case "Letrec": {
      const names = node.bindings.map((b) => b[0]);
      const inner = extend(env, names, names.map(() => undefined));
      return evalList(node.bindings.map((b) => b[1]), inner, 0, [], (vals) => {
        for (let i = 0; i < names.length; i++) inner.frame.set(names[i], vals[i]);
        return evaluate(node.body, inner, k);
      });
    }
    case "CallCC":
      return evaluate(node.fn, env, (fn) => applyProc(fn, [new Continuation(k)], k));
    default:
      throw new Error("unknown node " + node.tag);
  }
}

function run(program, globals) {
  let done = false;
  let result;
  let next = evaluate(program, extend(null, Object.keys(globals), Object.values(globals)), (v) => {
    done = true;
    result = v;
    return null;
  });
  while (!done) next = next();
  return result;
}

function toList(arr) {
  let list = null;
  for (let i = arr.length - 1; i >= 0; i--) list = { head: arr[i], tail: list };
  return list;
}

export function main(input) {
  return run(PROGRAM, { n: input.n, xs: toList(input.xs) });
}

export const inputs = [
  { n: 0, xs: [] },
  { n: 1, xs: [5] },
  { n: 10, xs: [1, 2, 3, 4] },
  { n: 50, xs: [3, 0, 7, 9] },
  { n: 100, xs: [2, 3, 5, 7, 11, 13, 17, 19, 23] },
  { n: 150, xs: [1, -1, 2, -2, 3, -3, 4, -4, 5, 0, 6, 6, 6] },
];
