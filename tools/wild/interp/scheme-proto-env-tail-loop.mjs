// style: Scheme subset (environments as prototype chains via Object.create), a tail-recursive count with let, inputs bound in an environment
// residue: "(lambda|define|cond|count-down)"
function read(src) {
  const toks = src.replace(/\(/g, " ( ").replace(/\)/g, " ) ").trim().split(/\s+/);
  let i = 0;
  function form() {
    const t = toks[i++];
    if (t === "(") { const xs = []; while (toks[i] !== ")") xs.push(form()); i++; return xs; }
    if (t === "#t") return true;
    if (t === "#f") return false;
    const n = Number(t);
    return Number.isNaN(n) ? t : n;
  }
  const out = [];
  while (i < toks.length) out.push(form());
  return out;
}
const PRIMS = {
  "+": (a, b) => a + b, "-": (a, b) => a - b, "*": (a, b) => a * b,
  "<": (a, b) => a < b, "=": (a, b) => a === b, ">": (a, b) => a > b,
  "cons": (a, b) => [a, b], "car": (p) => p[0], "cdr": (p) => p[1], "null?": (p) => p === null,
};
function evaluate(x, env) {
  for (;;) {
    if (typeof x === "string") { if (!(x in env)) throw new Error("unbound " + x); return env[x]; }
    if (!Array.isArray(x)) return x;
    switch (x[0]) {
      case "quote": return x[1];
      case "if": x = evaluate(x[1], env) !== false ? x[2] : x[3]; continue;
      case "define": env[x[1]] = evaluate(x[2], env); return undefined;
      case "lambda": return { params: x[1], body: x[2], env };
      case "let": {
        const e2 = Object.create(env);
        for (const [n, v] of x[1]) e2[n] = evaluate(v, env);
        env = e2; x = x[2]; continue;
      }
      case "cond": {
        let picked = null;
        for (const [test, body] of x.slice(1)) { if (test === "else" || evaluate(test, env) !== false) { picked = body; break; } }
        if (picked === null) return undefined;
        x = picked; continue;
      }
      default: {
        const f = evaluate(x[0], env);
        const args = x.slice(1).map((a) => evaluate(a, env));
        if (typeof f === "function") return f(...args);
        const e2 = Object.create(f.env);
        f.params.forEach((p, i) => { e2[p] = args[i]; });
        env = e2; x = f.body; continue;
      }
    }
  }
}
const PROGRAM = read(`
(define count-down (lambda (n acc) (let ((k (- n 1))) (if (< n 1) acc (count-down k (+ acc n))))))
`);
const GLOBAL = Object.create(null);
Object.assign(GLOBAL, PRIMS);
GLOBAL.null = null;
for (const form of PROGRAM) evaluate(form, GLOBAL);
export function main(input) {
  const env = Object.create(GLOBAL);
  env["input-n"] = input.n;
  return evaluate(["count-down", "input-n", 0], env);
}
export const inputs = [{ n: 0, k: 0 }, { n: 1, k: 1 }, { n: 10, k: 3 }, { n: 50, k: 5 }, { n: 200, k: 8 }, { n: 300, k: 2 }];
