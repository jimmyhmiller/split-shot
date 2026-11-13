// An interpreter whose `let` evaluates its bindings with an array method
// and a callback that closes over the environment:
// `node.bindings.map((b) => run(b.init, env))`. The interpreted `keep`
// recurses through that callback under runtime control. The recursion must
// be cut at the interpreter's own call inside the callback (specialized
// for the call's node and the environment's shape), not at the callback: a
// residual function of the callback is given the environment it closes
// over as a runtime value, and the program runs interpreted from there.
// Nor is the callback shared between the paths that reach it.
// One path binds `rest` to the program's quoted list and another to a
// call's result: where they meet, that list becomes a runtime value and
// the variable is lifted, the environment stays modeled (see
// `ref_field_targets`).
const K = (v) => ({ op: "Const", v });
const Q = (v) => ({ op: "Quote", v });
const V = (name) => ({ op: "Var", name });
const P = (name, ...args) => ({ op: "Prim", name, args });
const IF = (c, t, e) => ({ op: "If", c, t, e });
const LET = (bindings, body) => ({ op: "Let", bindings, body });
const CALL = (fn, ...args) => ({ op: "Call", fn, args });

const EMPTY = [];
const FUNS = {};
// (define (keep xs k)
//   (if (null? xs) '()
//     (let ((x (car xs)) (rest (keep (cdr xs) k)))
//       (if (< x k) (cons x rest) rest))))
FUNS.keep = {
  params: ["xs", "k"],
  body: IF(P("null?", V("xs")), Q(EMPTY),
    LET([{ name: "x", init: P("car", V("xs")) }, { name: "rest", init: CALL("keep", P("cdr", V("xs")), V("k")) }],
      IF(P("<", V("x"), V("k")), P("cons", V("x"), V("rest")), V("rest")))),
};

function lookup(env, name) {
  while (env !== null) {
    if (env.vars.has(name)) return env.vars.get(name);
    env = env.outer;
  }
  throw new Error("unbound: " + name);
}

function frame(names, values, outer) {
  const vars = new Map();
  for (let i = 0; i < names.length; i++) vars.set(names[i], values[i]);
  return { vars, outer };
}

function prim(name, a) {
  switch (name) {
    case "null?": return a[0].length === 0;
    case "car": return a[0][0];
    case "cdr": return a[0].slice(1);
    case "cons": return [a[0]].concat(a[1]);
    case "<": return a[0] < a[1];
  }
  throw new Error("bad prim " + name);
}

function run(node, env) {
  for (;;) {
    switch (node.op) {
      case "Const": return node.v;
      case "Quote": return node.v;
      case "Var": return lookup(env, node.name);
      case "Prim": return prim(node.name, node.args.map((a) => run(a, env)));
      case "If": node = run(node.c, env) ? node.t : node.e; continue;
      case "Let": {
        const names = node.bindings.map((b) => b.name);
        const values = node.bindings.map((b) => run(b.init, env));
        env = frame(names, values, env);
        node = node.body;
        continue;
      }
      case "Call": {
        const fn = FUNS[node.fn];
        const args = node.args.map((a) => run(a, env));
        env = frame(fn.params, args, null);
        node = fn.body;
        continue;
      }
      default: throw new Error("bad node " + node.op);
    }
  }
}

export function main(input) {
  return run(CALL("keep", V("xs"), V("k")), frame(["xs", "k"], [input.xs, input.k], null));
}
