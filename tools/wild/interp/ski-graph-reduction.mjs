// style: SKI combinator graph reduction (lambda terms bracket-abstracted at load, Turner-style in-place updates)
// residue: "(Ap|Comb|Prim)"
// A lambda calculus with integer primitives, compiled at load into S K I B C
// combinators by bracket abstraction, then run by a spine-unwinding graph
// reducer that overwrites each redex with its result (so shared work is done
// once). The fixed term iterates y -> (y*y + x) mod 1009 from the input x,
// 4 * 5 times and then 4^3 times, the counts being Church numerals.

// ---- source terms: ["lam", v, body] | ["app", f, a] | "v" | number | ["prim", name] ----
const lam = (v, body) => ["lam", v, body];
const app = (f, ...as) => as.reduce((acc, a) => ["app", acc, a], f);
const prim = (name) => ["prim", name];

const church = (n) => {
  let body = "x";
  for (let i = 0; i < n; i++) body = app("f", body);
  return lam("f", lam("x", body));
};
const MUL = lam("m", lam("n", lam("f", app("m", app("n", "f")))));
const STEP = lam("y", app(prim("%"), app(prim("+"), app(prim("*"), "y", "y"), "x"), 1009));
// x => (4^3) STEP ((4 * 5) STEP x)
const PROGRAM = lam("x", app(app(church(3), church(4)), STEP, app(app(MUL, church(4), church(5)), STEP, "x")));

// ---- bracket abstraction to combinators ----
const Ap = (f, a) => ({ t: "Ap", f, a });
const Comb = (name) => ({ t: "Comb", name });
const Lit = (value) => ({ t: "Lit", value });
const Prim = (name) => ({ t: "Prim", name });
const VarRef = (name) => ({ t: "Var", name });

function occurs(v, c) {
  if (c.t === "Var") return c.name === v;
  if (c.t === "Ap") return occurs(v, c.f) || occurs(v, c.a);
  return false;
}

// abstract v out of an already lambda-free term c
function abstract(v, c) {
  if (!occurs(v, c)) return Ap(Comb("K"), c);
  if (c.t === "Var") return Comb("I");
  // c is an application that mentions v
  if (c.a.t === "Var" && c.a.name === v && !occurs(v, c.f)) return c.f; // eta
  const inF = occurs(v, c.f);
  const inA = occurs(v, c.a);
  if (!inF) return Ap(Ap(Comb("B"), c.f), abstract(v, c.a));
  if (!inA) return Ap(Ap(Comb("C"), abstract(v, c.f)), c.a);
  return Ap(Ap(Comb("S"), abstract(v, c.f)), abstract(v, c.a));
}

function compile(term) {
  if (typeof term === "number") return Lit(term);
  if (typeof term === "string") return VarRef(term);
  switch (term[0]) {
    case "prim": return Prim(term[1]);
    case "app": return Ap(compile(term[1]), compile(term[2]));
    case "lam": return abstract(term[1], compile(term[2]));
    default: throw new Error("bad term " + JSON.stringify(term));
  }
}

function checkClosed(c) {
  if (c.t === "Var") throw new Error("free variable " + c.name);
  if (c.t === "Ap") { checkClosed(c.f); checkClosed(c.a); }
}

const COMPILED = compile(PROGRAM);
checkClosed(COMPILED);

// ---- the reducer ----
const ARITY = { I: 1, K: 2, S: 3, B: 3, C: 3 };
const PRIM_OPS = {
  "+": (a, b) => a + b,
  "*": (a, b) => a * b,
  "%": (a, b) => a % b,
};

// Overwrite node in place with the contents of result.
function update(node, result) {
  if (node === result) return;
  node.t = result.t;
  node.f = result.f;
  node.a = result.a;
  node.name = result.name;
  node.value = result.value;
}

let steps = 0;

// Reduce to weak head normal form, updating redexes in place.
function whnf(root) {
  for (;;) {
    const spine = [];
    let head = root;
    while (head.t === "Ap") { spine.push(head); head = head.f; }
    const argc = spine.length;
    const arg = (i) => spine[argc - 1 - i].a;
    let need, result;
    if (head.t === "Comb") {
      need = ARITY[head.name];
      if (argc < need) return root;
      switch (head.name) {
        case "I": result = arg(0); break;
        case "K": result = arg(0); break;
        case "S": result = Ap(Ap(arg(0), arg(2)), Ap(arg(1), arg(2))); break;
        case "B": result = Ap(arg(0), Ap(arg(1), arg(2))); break;
        case "C": result = Ap(Ap(arg(0), arg(2)), arg(1)); break;
        default: throw new Error("unknown combinator " + head.name);
      }
    } else if (head.t === "Prim") {
      need = 2;
      if (argc < need) return root;
      const a = whnf(arg(0));
      const b = whnf(arg(1));
      if (a.t !== "Lit" || b.t !== "Lit") throw new TypeError("primitive " + head.name + " applied to a non-number");
      result = Lit(PRIM_OPS[head.name](a.value, b.value));
    } else if (head.t === "Lit") {
      if (argc > 0) throw new TypeError("a number applied as a function");
      return root;
    } else {
      throw new Error("cannot reduce " + head.t);
    }
    if (++steps > 1e6) throw new RangeError("too many reduction steps");
    // The redex is the application node holding the last argument consumed.
    const redex = spine[argc - need];
    // An indirection through I or K must copy a node, not alias it: copy it.
    update(redex, result.t === "Ap" ? Ap(result.f, result.a) : result);
  }
}

export function main(input) {
  steps = 0;
  const root = Ap(COMPILED, Lit(input.x));
  const v = whnf(root);
  if (v.t !== "Lit") throw new TypeError("result is not a number");
  // Not the step count: closed redexes inside COMPILED are reduced in place
  // once and shared by later calls, so it differs between the first call and
  // the rest.
  return v.value;
}

export const inputs = [{ x: 0 }, { x: 1 }, { x: -3 }, { x: 7 }, { x: 1008 }, { x: 123456 }];
