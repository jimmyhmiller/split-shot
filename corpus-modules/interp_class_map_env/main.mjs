// An interpreter whose environments are instances of a class (methods
// `find`, `lookup`) holding their variables in a Map, made per call. The
// interpreted `fib` recurses under runtime control, so its calls become a
// residual function specialized for the call's node and given the
// environment's leaves. That function must not be passed the class's
// methods (values a capture's shape locates, see `import_paths`): passed,
// they are runtime values to the caller from there on, `env.lookup` is an
// unknown call, and the global environment is made at runtime. The
// interpreted `sum` is a tail call, a loop in the interpreter that makes a
// fresh environment (and its Map) per iteration: the Maps of two visits of
// the loop head stand for each other (`pair_fresh`), their values lifted.
const K = (v) => ({ op: "Const", v });
const V = (name) => ({ op: "Var", name });
const P = (name, a, b) => ({ op: "Prim", name, a, b });
const IF = (c, t, e) => ({ op: "If", c, t, e });
const CALL = (fn, ...args) => ({ op: "Call", fn, args });

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
    throw new Error("unbound: " + name);
  }
  lookup(name) {
    return this.find(name).vars.get(name);
  }
}

class Procedure {
  constructor(params, body, env) {
    this.params = params;
    this.body = body;
    this.env = env;
  }
}

const globalEnv = new Env([], [], null);
// (define (fib n) (if (< n 2) n (+ (fib (- n 1)) (fib (- n 2)))))
globalEnv.vars.set("fib", new Procedure(["n"],
  IF(P("<", V("n"), K(2)), V("n"), P("+", CALL(V("fib"), P("-", V("n"), K(1))), CALL(V("fib"), P("-", V("n"), K(2))))),
  globalEnv));
// (define (sum n acc) (if (< n 1) acc (sum (- n 1) (+ acc n))))
globalEnv.vars.set("sum", new Procedure(["n", "acc"],
  IF(P("<", V("n"), K(1)), V("acc"), CALL(V("sum"), P("-", V("n"), K(1)), P("+", V("acc"), V("n")))),
  globalEnv));

function run(node, env) {
  for (;;) {
    switch (node.op) {
      case "Const": return node.v;
      case "Var": return env.lookup(node.name);
      case "Prim": {
        const a = run(node.a, env), b = run(node.b, env);
        switch (node.name) { case "+": return a + b; case "-": return a - b; case "<": return a < b; }
        throw new Error("bad prim");
      }
      case "If": node = run(node.c, env) ? node.t : node.e; continue;
      case "Call": {
        const proc = run(node.fn, env);
        const args = [];
        for (let i = 0; i < node.args.length; i++) args.push(run(node.args[i], env));
        env = new Env(proc.params, args, proc.env);
        node = proc.body;
        continue;
      }
      default: throw new Error("bad node " + node.op);
    }
  }
}

export function main(input) {
  const env = new Env(["n"], [input.n], globalEnv);
  return [run(CALL(V("fib"), V("n")), env), run(CALL(V("sum"), V("n"), K(0)), env)];
}
