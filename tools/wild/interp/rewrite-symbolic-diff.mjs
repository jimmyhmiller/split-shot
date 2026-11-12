// style: term rewriting (pattern/template rules with pattern variables, innermost rewriting to a normal form)
// residue: "(\?a|\?b|#n|#m)"
// A rewrite-rule interpreter: rules are data (a pattern with variables, a
// template or a function of the bindings), applied innermost-first until no
// rule fires. The fixed rule set differentiates and simplifies; the fixed
// expression has the input c substituted in, so which simplifications fire
// depends on it. Returns the first and second derivatives, printed, and their
// values at the input x.

// Terms: a number, a symbol (string), or [operator, ...arguments].
// Pattern variables: "?name" matches any term, "#name" matches only a number;
// a variable used twice must match equal terms.
const RULES = [
  // differentiation with respect to x
  [["d", "#n"], 0],
  [["d", "x"], 1],
  [["d", ["+", "?a", "?b"]], ["+", ["d", "?a"], ["d", "?b"]]],
  [["d", ["*", "?a", "?b"]], ["+", ["*", ["d", "?a"], "?b"], ["*", "?a", ["d", "?b"]]]],
  [["d", ["^", "?a", "#n"]], (b) => ["*", ["*", b["#n"], ["^", b["?a"], b["#n"] - 1]], ["d", b["?a"]]]],
  [["d", ["sin", "?a"]], ["*", ["cos", "?a"], ["d", "?a"]]],
  [["d", ["cos", "?a"]], ["*", ["neg", ["sin", "?a"]], ["d", "?a"]]],
  [["d", ["neg", "?a"]], ["neg", ["d", "?a"]]],
  // constant folding
  [["+", "#n", "#m"], (b) => b["#n"] + b["#m"]],
  [["*", "#n", "#m"], (b) => b["#n"] * b["#m"]],
  [["neg", "#n"], (b) => -b["#n"]],
  [["^", "#n", "#m"], (b) => Math.pow(b["#n"], b["#m"])],
  [["sin", 0], 0],
  [["cos", 0], 1],
  // identities
  [["+", 0, "?a"], "?a"],
  [["+", "?a", 0], "?a"],
  [["*", 0, "?a"], 0],
  [["*", "?a", 0], 0],
  [["*", 1, "?a"], "?a"],
  [["*", "?a", 1], "?a"],
  [["^", "?a", 1], "?a"],
  [["^", "?a", 0], 1],
  [["neg", ["neg", "?a"]], "?a"],
  [["*", -1, "?a"], ["neg", "?a"]],
  [["+", "?a", "?a"], ["*", 2, "?a"]],
  [["*", "?a", "?a"], ["^", "?a", 2]],
  [["*", "?a", ["^", "?a", "#n"]], (b) => ["^", b["?a"], b["#n"] + 1]],
  // constants to the left, and gathered
  [["*", "?a", "#n"], ["*", "#n", "?a"]],
  [["*", "#n", ["*", "#m", "?a"]], (b) => ["*", b["#n"] * b["#m"], b["?a"]]],
  [["*", "?a", ["*", "#n", "?b"]], ["*", "#n", ["*", "?a", "?b"]]],
  [["*", ["neg", "?a"], "?b"], ["neg", ["*", "?a", "?b"]]],
  [["*", "?a", ["neg", "?b"]], ["neg", ["*", "?a", "?b"]]],
  [["+", "?a", ["neg", "?b"]], ["-", "?a", "?b"]],
];

function isVar(p) {
  return typeof p === "string" && (p[0] === "?" || p[0] === "#");
}

function equal(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (!equal(a[i], b[i])) return false;
  return true;
}

function match(pattern, term, bindings) {
  if (isVar(pattern)) {
    if (pattern[0] === "#" && typeof term !== "number") return false;
    if (Object.prototype.hasOwnProperty.call(bindings, pattern)) return equal(bindings[pattern], term);
    bindings[pattern] = term;
    return true;
  }
  if (Array.isArray(pattern)) {
    if (!Array.isArray(term) || term.length !== pattern.length) return false;
    for (let i = 0; i < pattern.length; i++) if (!match(pattern[i], term[i], bindings)) return false;
    return true;
  }
  return pattern === term;
}

function instantiate(template, bindings) {
  if (typeof template === "function") return template(bindings);
  if (isVar(template)) {
    if (!Object.prototype.hasOwnProperty.call(bindings, template)) throw new Error("unbound pattern variable " + template);
    return bindings[template];
  }
  if (Array.isArray(template)) return template.map((t) => instantiate(t, bindings));
  return template;
}

function rewriteRoot(term, rules) {
  for (const [lhs, rhs] of rules) {
    const bindings = {};
    if (match(lhs, term, bindings)) return { fired: true, term: instantiate(rhs, bindings) };
  }
  return { fired: false, term };
}

let fuel = 0;
function normalize(term, rules) {
  for (;;) {
    if (Array.isArray(term)) {
      const args = term.slice(1).map((t) => normalize(t, rules));
      term = [term[0], ...args];
    }
    const r = rewriteRoot(term, rules);
    if (!r.fired) return term;
    if (--fuel < 0) throw new RangeError("rewriting did not terminate");
    term = r.term;
  }
}

function substitute(term, name, value) {
  if (term === name) return value;
  if (Array.isArray(term)) return term.map((t) => substitute(t, name, value));
  return term;
}

function show(term) {
  if (typeof term === "number") return String(term);
  if (typeof term === "string") return term;
  const [op, a, b] = term;
  switch (op) {
    case "+": case "-": case "*": case "^": return "(" + show(a) + " " + op + " " + show(b) + ")";
    case "neg": return "-" + show(a);
    default: return op + "(" + term.slice(1).map(show).join(", ") + ")";
  }
}

function evaluate(term, x) {
  if (typeof term === "number") return term;
  if (term === "x") return x;
  if (typeof term === "string") throw new ReferenceError("free symbol " + term);
  const v = term.slice(1).map((t) => evaluate(t, x));
  switch (term[0]) {
    case "+": return v[0] + v[1];
    case "-": return v[0] - v[1];
    case "*": return v[0] * v[1];
    case "^": return Math.pow(v[0], v[1]);
    case "neg": return -v[0];
    case "sin": return Math.sin(v[0]);
    case "cos": return Math.cos(v[0]);
    default: throw new Error("cannot evaluate " + term[0]);
  }
}

// f(x) = c * x^3 + (x + c)^2 + sin(c * x) * x
const EXPR = ["+", ["*", "c", ["^", "x", 3]], ["+", ["^", ["+", "x", "c"], 2], ["*", ["sin", ["*", "c", "x"]], "x"]]];

export function main(input) {
  fuel = 10000;
  const f = normalize(substitute(EXPR, "c", input.c), RULES);
  const df = normalize(["d", f], RULES);
  const ddf = normalize(["d", df], RULES);
  return { f: show(f), df: show(df), ddf: show(ddf), at: [evaluate(df, input.x), evaluate(ddf, input.x)] };
}

export const inputs = [
  { c: 0, x: 0 },
  { c: 1, x: 2 },
  { c: -1, x: 1 },
  { c: 2, x: -1 },
  { c: 0.5, x: 10 },
  { c: 7, x: 3 },
];
