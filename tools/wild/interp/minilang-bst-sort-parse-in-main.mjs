// style: source text parsed inside main on every call (tokenizer, recursive-descent parser, AST evaluator with first-class functions and records)
// residue: "(CallExpr|FieldExpr|IfExpr|RecordExpr|LambdaExpr|LetExpr|BinaryExpr|NameExpr)"
// A small expression language (let, if, fun, lambdas, records, recursion)
// whose program text is tokenized and parsed on every call, inside main (the
// fixed source is a constant, so the parse is fixed work). The program builds
// a binary search tree from the input array, then returns the keys in order
// (mapped through a closure), the tree's height and the sum of the keys.

const SOURCE = `
fun insert(t, k) =
  if t == nil then {key: k, left: nil, right: nil}
  else if k < t.key then {key: t.key, left: insert(t.left, k), right: t.right}
  else {key: t.key, left: t.left, right: insert(t.right, k)};

fun build(xs, i, t) =
  if i == len(xs) then t else build(xs, i + 1, insert(t, xs[i]));

fun toList(t, acc) =
  if t == nil then acc
  else toList(t.left, {head: t.key, tail: toList(t.right, acc)});

fun map(f, l) = if l == nil then nil else {head: f(l.head), tail: map(f, l.tail)};

fun fold(f, acc, l) = if l == nil then acc else fold(f, f(acc, l.head), l.tail);

fun height(t) = if t == nil then 0 else 1 + max(height(t.left), height(t.right));

fun main(xs, scale) =
  let t = build(xs, 0, nil) in
  let sorted = toList(t, nil) in
  {sorted: map(fn(x) => x * scale, sorted),
   height: height(t),
   sum: fold(fn(a, b) => a + b, 0, sorted)};
`;

// ---- tokenizer ----
const KEYWORDS = new Set(["fun", "fn", "let", "in", "if", "then", "else", "nil", "true", "false"]);

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\n" || c === "\t" || c === "\r") { i++; continue; }
    if (c >= "0" && c <= "9") {
      let j = i;
      while (j < src.length && ((src[j] >= "0" && src[j] <= "9") || src[j] === ".")) j++;
      tokens.push({ kind: "num", value: Number(src.slice(i, j)) });
      i = j;
      continue;
    }
    if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_") {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      const word = src.slice(i, j);
      tokens.push(KEYWORDS.has(word) ? { kind: word } : { kind: "ident", value: word });
      i = j;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (two === "==" || two === "!=" || two === "<=" || two === ">=" || two === "=>" || two === "&&" || two === "||") {
      tokens.push({ kind: two });
      i += 2;
      continue;
    }
    if ("+-*/%<>=(){}[],.:;!".includes(c)) {
      tokens.push({ kind: c });
      i++;
      continue;
    }
    throw new SyntaxError("unexpected character " + JSON.stringify(c) + " at " + i);
  }
  tokens.push({ kind: "eof" });
  return tokens;
}

// ---- parser ----
const PRECEDENCE = { "||": 1, "&&": 2, "==": 3, "!=": 3, "<": 4, "<=": 4, ">": 4, ">=": 4, "+": 5, "-": 5, "*": 6, "/": 6, "%": 6 };

class Parser {
  constructor(tokens) { this.tokens = tokens; this.pos = 0; }
  peek() { return this.tokens[this.pos]; }
  next() { return this.tokens[this.pos++]; }
  at(kind) { return this.peek().kind === kind; }
  expect(kind) {
    const t = this.next();
    if (t.kind !== kind) throw new SyntaxError("expected " + kind + " but found " + t.kind);
    return t;
  }
  parseProgram() {
    const defs = [];
    while (!this.at("eof")) {
      this.expect("fun");
      const name = this.expect("ident").value;
      const params = this.parseParams();
      this.expect("=");
      const body = this.parseExpr();
      this.expect(";");
      defs.push({ name, params, body });
    }
    return defs;
  }
  parseParams() {
    this.expect("(");
    const params = [];
    if (!this.at(")")) {
      do params.push(this.expect("ident").value);
      while (this.at(",") && this.next());
    }
    this.expect(")");
    return params;
  }
  parseExpr() {
    if (this.at("if")) {
      this.next();
      const test = this.parseExpr();
      this.expect("then");
      const then = this.parseExpr();
      this.expect("else");
      const otherwise = this.parseExpr();
      return { type: "IfExpr", test, then, otherwise };
    }
    if (this.at("let")) {
      this.next();
      const name = this.expect("ident").value;
      this.expect("=");
      const value = this.parseExpr();
      this.expect("in");
      const body = this.parseExpr();
      return { type: "LetExpr", name, value, body };
    }
    if (this.at("fn")) {
      this.next();
      const params = this.parseParams();
      this.expect("=>");
      return { type: "LambdaExpr", params, body: this.parseExpr() };
    }
    return this.parseBinary(1);
  }
  parseBinary(minPrec) {
    let left = this.parseUnary();
    for (;;) {
      const op = this.peek().kind;
      const prec = PRECEDENCE[op];
      if (prec === undefined || prec < minPrec) return left;
      this.next();
      const right = this.parseBinary(prec + 1);
      left = { type: "BinaryExpr", op, left, right };
    }
  }
  parseUnary() {
    if (this.at("-")) { this.next(); return { type: "BinaryExpr", op: "-", left: { type: "Literal", value: 0 }, right: this.parseUnary() }; }
    if (this.at("!")) { this.next(); return { type: "NotExpr", operand: this.parseUnary() }; }
    return this.parsePostfix();
  }
  parsePostfix() {
    let e = this.parsePrimary();
    for (;;) {
      if (this.at(".")) {
        this.next();
        e = { type: "FieldExpr", object: e, field: this.expect("ident").value };
      } else if (this.at("[")) {
        this.next();
        const index = this.parseExpr();
        this.expect("]");
        e = { type: "IndexExpr", object: e, index };
      } else if (this.at("(")) {
        this.next();
        const args = [];
        if (!this.at(")")) {
          do args.push(this.parseExpr());
          while (this.at(",") && this.next());
        }
        this.expect(")");
        e = { type: "CallExpr", callee: e, args };
      } else {
        return e;
      }
    }
  }
  parsePrimary() {
    const t = this.next();
    switch (t.kind) {
      case "num": return { type: "Literal", value: t.value };
      case "nil": return { type: "Literal", value: null };
      case "true": return { type: "Literal", value: true };
      case "false": return { type: "Literal", value: false };
      case "ident": return { type: "NameExpr", name: t.value };
      case "(": {
        const e = this.parseExpr();
        this.expect(")");
        return e;
      }
      case "{": {
        const fields = [];
        if (!this.at("}")) {
          do {
            const name = this.expect("ident").value;
            this.expect(":");
            fields.push([name, this.parseExpr()]);
          } while (this.at(",") && this.next());
        }
        this.expect("}");
        return { type: "RecordExpr", fields };
      }
      default:
        throw new SyntaxError("unexpected token " + t.kind);
    }
  }
}

// ---- evaluator ----
class Scope {
  constructor(vars, parent) { this.vars = vars; this.parent = parent; }
  lookup(name) {
    for (let s = this; s !== null; s = s.parent) {
      if (s.vars.has(name)) return s.vars.get(name);
    }
    throw new ReferenceError("unbound name " + name);
  }
}

class Fn {
  constructor(params, body, scope, name) { this.params = params; this.body = body; this.scope = scope; this.name = name; }
}

const BUILTINS = new Map([
  ["len", (xs) => xs.length],
  ["max", (a, b) => (a > b ? a : b)],
  ["min", (a, b) => (a < b ? a : b)],
]);

function callFn(f, args) {
  if (typeof f === "function") return f(...args);
  if (!(f instanceof Fn)) throw new TypeError("calling a non-function");
  if (args.length !== f.params.length) throw new TypeError((f.name || "lambda") + ": expected " + f.params.length + " arguments, got " + args.length);
  const vars = new Map();
  for (let i = 0; i < args.length; i++) vars.set(f.params[i], args[i]);
  return evaluate(f.body, new Scope(vars, f.scope));
}

function evaluate(e, scope) {
  switch (e.type) {
    case "Literal": return e.value;
    case "NameExpr": return scope.lookup(e.name);
    case "BinaryExpr": {
      if (e.op === "&&") return evaluate(e.left, scope) && evaluate(e.right, scope);
      if (e.op === "||") return evaluate(e.left, scope) || evaluate(e.right, scope);
      const a = evaluate(e.left, scope);
      const b = evaluate(e.right, scope);
      switch (e.op) {
        case "+": return a + b;
        case "-": return a - b;
        case "*": return a * b;
        case "/": return a / b;
        case "%": return a % b;
        case "==": return a === b;
        case "!=": return a !== b;
        case "<": return a < b;
        case "<=": return a <= b;
        case ">": return a > b;
        case ">=": return a >= b;
        default: throw new Error("unknown operator " + e.op);
      }
    }
    case "NotExpr": return !evaluate(e.operand, scope);
    case "IfExpr": return evaluate(e.test, scope) ? evaluate(e.then, scope) : evaluate(e.otherwise, scope);
    case "LetExpr": return evaluate(e.body, new Scope(new Map([[e.name, evaluate(e.value, scope)]]), scope));
    case "LambdaExpr": return new Fn(e.params, e.body, scope, null);
    case "CallExpr": return callFn(evaluate(e.callee, scope), e.args.map((a) => evaluate(a, scope)));
    case "FieldExpr": {
      const o = evaluate(e.object, scope);
      if (o === null || typeof o !== "object") throw new TypeError("field " + e.field + " of a non-record");
      if (!Object.prototype.hasOwnProperty.call(o, e.field)) throw new TypeError("record has no field " + e.field);
      return o[e.field];
    }
    case "IndexExpr": {
      const o = evaluate(e.object, scope);
      const i = evaluate(e.index, scope);
      if (!Array.isArray(o) || i < 0 || i >= o.length) throw new RangeError("index out of range");
      return o[i];
    }
    case "RecordExpr": {
      const r = {};
      for (const [name, v] of e.fields) r[name] = evaluate(v, scope);
      return r;
    }
    default:
      throw new Error("unknown expression " + e.type);
  }
}

function load(src) {
  const defs = new Parser(tokenize(src)).parseProgram();
  const globals = new Scope(new Map(BUILTINS), null);
  for (const d of defs) globals.vars.set(d.name, new Fn(d.params, d.body, globals, d.name));
  return globals;
}

function listToArray(l) {
  const out = [];
  for (; l !== null; l = l.tail) out.push(l.head);
  return out;
}

export function main(input) {
  const globals = load(SOURCE);
  const r = callFn(globals.lookup("main"), [input.xs, input.scale]);
  return { sorted: listToArray(r.sorted), height: r.height, sum: r.sum };
}

export const inputs = [
  { xs: [], scale: 1 },
  { xs: 5, scale: 1 },
  { xs: [42], scale: 2 },
  { xs: [3, 1, 2], scale: -1 },
  { xs: [1, 2, 3, 4, 5, 6, 7, 8], scale: 1 },
  { xs: [50, 20, 80, 10, 30, 70, 90, 25, 35, 65, 75, 5, 15, 85, 95, 60, 40, 55, 45, 100], scale: 3 },
  { xs: [9, 4, 7, 1, 8, 2, 6, 3, 5, 0, 19, 14, 17, 11, 18, 12, 16, 13, 15, 10, 29, 24, 27, 21, 28, 22, 26, 23, 25, 20, 4, 9, 1], scale: 0.5 },
];
