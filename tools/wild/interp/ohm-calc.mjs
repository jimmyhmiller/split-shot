// style: npm ohm-js (PEG grammar interpreted by pexpr.eval with packrat memo, CST walked by semantic actions)
// residue: \b(reallyEval|evalOnce|handleCycle)\b
// ohm-js with a fixed grammar and semantics, built at load: a small calculator
// language with `let` bindings, precedence, unary minus, parentheses and
// function calls; main parses and evaluates the input source text.
import * as ohm from "ohm-js";
const GRAMMAR = ohm.grammar(String.raw`
  Calc {
    Program = (Stmt ";")* Exp
    Stmt = "let" ident "=" Exp
    Exp = Exp "+" Term  -- plus
        | Exp "-" Term  -- minus
        | Term
    Term = Term "*" Factor  -- times
         | Term "/" Factor  -- divide
         | Term "%" Factor  -- mod
         | Factor
    Factor = "-" Factor  -- neg
           | Primary "^" Factor  -- pow
           | Primary
    Primary = "(" Exp ")"  -- paren
            | ident "(" ListOf<Exp, ","> ")"  -- call
            | ident  -- var
            | number
    ident = ~"let" letter alnum*
    number = digit+ ("." digit+)?
  }
`);
const FUNCTIONS = { max: Math.max, min: Math.min, abs: Math.abs, sqrt: Math.sqrt };
const SEMANTICS = GRAMMAR.createSemantics().addOperation("eval(env)", {
  Program(stmts, _semis, exp) {
    const env = this.args.env;
    for (const s of stmts.children) s.eval(env);
    return exp.eval(env);
  },
  Stmt(_let, id, _eq, exp) {
    const env = this.args.env;
    env[id.sourceString] = exp.eval(env);
    return undefined;
  },
  Exp_plus(a, _, b) { return a.eval(this.args.env) + b.eval(this.args.env); },
  Exp_minus(a, _, b) { return a.eval(this.args.env) - b.eval(this.args.env); },
  Term_times(a, _, b) { return a.eval(this.args.env) * b.eval(this.args.env); },
  Term_divide(a, _, b) { return a.eval(this.args.env) / b.eval(this.args.env); },
  Term_mod(a, _, b) { return a.eval(this.args.env) % b.eval(this.args.env); },
  Factor_neg(_, a) { return -a.eval(this.args.env); },
  Factor_pow(a, _, b) { return a.eval(this.args.env) ** b.eval(this.args.env); },
  Primary_paren(_l, e, _r) { return e.eval(this.args.env); },
  Primary_call(id, _l, args, _r) {
    const fn = FUNCTIONS[id.sourceString];
    if (!fn) throw new Error("unknown function " + id.sourceString);
    return fn(...args.asIteration().children.map((a) => a.eval(this.args.env)));
  },
  Primary_var(id) {
    const env = this.args.env;
    if (!(id.sourceString in env)) throw new Error("unbound " + id.sourceString);
    return env[id.sourceString];
  },
  number(_int, _dot, _frac) { return parseFloat(this.sourceString); },
});
export function main(input) {
  const m = GRAMMAR.match(input.src);
  if (m.failed()) return { error: m.shortMessage };
  try {
    return { value: SEMANTICS(m).eval(Object.create(null)) };
  } catch (e) {
    return { error: e.message };
  }
}
export const inputs = [
  { src: "" },
  { src: "42" },
  { src: "1 + 2 * 3 - 4 / 2" },
  { src: "let a = 3; let b = a * a + 1; max(a, b, 7) - -b ^ 2 % 5" },
  { src: "let x = 2; let y = (x + 1) * (x - 1) / sqrt(16); let z = min(y, abs(-x), 9) * 100; z + y * x - (x ^ 3 ^ 2) % 7 + ((((x))))" },
  { src: "let q = 1; q + w" },
  { src: "3 + * 4" },
];
