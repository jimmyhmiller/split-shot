// An interpreter whose environments are records made per call (a frame of
// slots linked to its parent): a call of an interpreted function that
// stalls under runtime control becomes a residual function specialized for
// the call's node, given the environment's leaves (see `ArgShape::Record`),
// not the environment. The interpreted `ack`-like function compiles to
// direct recursion over its numbers; the frames and the syntax tree are
// gone. Its tail call loops in the interpreter, each iteration holding the
// frame the last one made while it fills the next (`pair_fresh`'s rotated
// pairs, `field_ranks`). Frames link to the function's own environment
// (lexical scope): one linked to its caller's would be a longer record at
// every call, and no one shape.
const K = (v) => ({ op: "Const", v });
const L = (i) => ({ op: "Local", i });
const P = (name, a, b) => ({ op: "Prim", name, a, b });
const IF = (c, t, e) => ({ op: "If", c, t, e });
const CALL = (fn, ...args) => ({ op: "Call", fn, args });
const FUNS = {};
// (define (f m n) (if (< m 1) (+ n 1) (if (< n 1) (f (- m 1) 1) (f (- m 1) (f m (- n 1))))))
FUNS.f = {
  arity: 2,
  env: null,
  body: IF(P("<", L(0), K(1)), P("+", L(1), K(1)),
    IF(P("<", L(1), K(1)), CALL("f", P("-", L(0), K(1)), K(1)),
      CALL("f", P("-", L(0), K(1)), CALL("f", L(0), P("-", L(1), K(1)))))),
};
function run(node, env) {
  for (;;) {
    switch (node.op) {
      case "Const": return node.v;
      case "Local": return env.slots[node.i];
      case "Prim": {
        const a = run(node.a, env), b = run(node.b, env);
        switch (node.name) { case "+": return a + b; case "-": return a - b; case "<": return a < b; }
        throw new Error("bad prim");
      }
      case "If": node = run(node.c, env) ? node.t : node.e; continue;
      case "Call": {
        const fn = FUNS[node.fn];
        const slots = new Array(node.args.length);
        for (let i = 0; i < slots.length; i++) slots[i] = run(node.args[i], env);
        env = { slots, up: fn.env };
        node = fn.body;
        continue;
      }
      default: throw new Error("bad node " + node.op);
    }
  }
}
export function main(input) {
  return run(CALL("f", L(0), L(1)), { slots: [input.m, input.n], up: null });
}
