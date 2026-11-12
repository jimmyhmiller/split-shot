// style: expression evaluator (formula string tokenized and Pratt-parsed inside main on every call, then the AST tree-walked per binding)
// residue: TOK_(NUM|IDENT|OP|LPAREN|RPAREN|COMMA|EOF)|"(NumLit|VarRef|BinOp|UnaryOp|CallExpr|CondExpr)"
// A spreadsheet-style formula language: numbers, variables, + - * / % ^
// (right-associative), unary - and !, comparisons, && ||, a ? b : c,
// and calls to min max abs sqrt floor clamp. The formula is fixed, but like
// many calculators this one re-parses it on every call: main tokenizes and
// Pratt-parses it, then evaluates the tree for each set of variables.
const FORMULA = "clamp(base * (1 + rate / 100) ^ years - fee * max(years - 1, 0), 0, cap) + " +
  "(bonus > 0 && years >= 3 ? bonus * 2 : -abs(penalty) % 7) + floor(sqrt(base) * 10) / 10";

function tokenize(src) {
  const toks = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t" || c === "\n") { i++; continue; }
    if ((c >= "0" && c <= "9") || (c === "." && src[i + 1] >= "0" && src[i + 1] <= "9")) {
      let j = i;
      while (j < src.length && ((src[j] >= "0" && src[j] <= "9") || src[j] === ".")) j++;
      if (src[j] === "e" || src[j] === "E") {
        j++;
        if (src[j] === "+" || src[j] === "-") j++;
        while (src[j] >= "0" && src[j] <= "9") j++;
      }
      toks.push({ type: "TOK_NUM", value: parseFloat(src.slice(i, j)), pos: i });
      i = j;
    } else if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_") {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      toks.push({ type: "TOK_IDENT", value: src.slice(i, j), pos: i });
      i = j;
    } else if (c === "(") { toks.push({ type: "TOK_LPAREN", value: c, pos: i }); i++; }
    else if (c === ")") { toks.push({ type: "TOK_RPAREN", value: c, pos: i }); i++; }
    else if (c === ",") { toks.push({ type: "TOK_COMMA", value: c, pos: i }); i++; }
    else {
      const two = src.slice(i, i + 2);
      if (two === "&&" || two === "||" || two === "==" || two === "!=" || two === "<=" || two === ">=") {
        toks.push({ type: "TOK_OP", value: two, pos: i });
        i += 2;
      } else if ("+-*/%^<>!?:".includes(c)) {
        toks.push({ type: "TOK_OP", value: c, pos: i });
        i++;
      } else {
        throw new SyntaxError("unexpected '" + c + "' at " + i);
      }
    }
  }
  toks.push({ type: "TOK_EOF", value: null, pos: src.length });
  return toks;
}

// binding powers: [left, right]; right < left makes an operator right-associative
const INFIX = {
  "?": [2, 1],
  "||": [3, 4],
  "&&": [5, 6],
  "==": [7, 8], "!=": [7, 8],
  "<": [9, 10], "<=": [9, 10], ">": [9, 10], ">=": [9, 10],
  "+": [11, 12], "-": [11, 12],
  "*": [13, 14], "/": [13, 14], "%": [13, 14],
  "^": [17, 16],
};
const PREFIX_BP = 15;

class Parser {
  constructor(src) {
    this.toks = tokenize(src);
    this.pos = 0;
  }
  peek() { return this.toks[this.pos]; }
  next() { return this.toks[this.pos++]; }
  expect(type, value) {
    const t = this.next();
    if (t.type !== type || (value !== undefined && t.value !== value)) {
      throw new SyntaxError("expected " + (value || type) + " at " + t.pos);
    }
    return t;
  }
  parse() {
    const e = this.expr(0);
    this.expect("TOK_EOF");
    return e;
  }
  expr(minBp) {
    let left = this.nud(this.next());
    for (;;) {
      const t = this.peek();
      if (t.type !== "TOK_OP" || !Object.prototype.hasOwnProperty.call(INFIX, t.value)) break;
      const [lbp, rbp] = INFIX[t.value];
      if (lbp < minBp) break;
      this.next();
      if (t.value === "?") {
        const then = this.expr(0);
        this.expect("TOK_OP", ":");
        const otherwise = this.expr(rbp);
        left = { type: "CondExpr", test: left, then, otherwise };
      } else {
        left = { type: "BinOp", op: t.value, left, right: this.expr(rbp) };
      }
    }
    return left;
  }
  nud(t) {
    switch (t.type) {
      case "TOK_NUM":
        return { type: "NumLit", value: t.value };
      case "TOK_IDENT":
        if (this.peek().type === "TOK_LPAREN") {
          this.next();
          const args = [];
          if (this.peek().type !== "TOK_RPAREN") {
            args.push(this.expr(0));
            while (this.peek().type === "TOK_COMMA") { this.next(); args.push(this.expr(0)); }
          }
          this.expect("TOK_RPAREN");
          return { type: "CallExpr", callee: t.value, args };
        }
        return { type: "VarRef", name: t.value };
      case "TOK_LPAREN": {
        const e = this.expr(0);
        this.expect("TOK_RPAREN");
        return e;
      }
      case "TOK_OP":
        if (t.value === "-" || t.value === "!" || t.value === "+") {
          return { type: "UnaryOp", op: t.value, arg: this.expr(PREFIX_BP) };
        }
    }
    throw new SyntaxError("unexpected token " + (t.value === null ? "end" : t.value) + " at " + t.pos);
  }
}

const FUNCTIONS = {
  min: (...a) => Math.min(...a),
  max: (...a) => Math.max(...a),
  abs: (x) => Math.abs(x),
  sqrt: (x) => Math.sqrt(x),
  floor: (x) => Math.floor(x),
  clamp: (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x),
};

function evaluate(node, env) {
  switch (node.type) {
    case "NumLit":
      return node.value;
    case "VarRef":
      if (!Object.prototype.hasOwnProperty.call(env, node.name)) throw new ReferenceError("unbound variable " + node.name);
      return env[node.name];
    case "UnaryOp": {
      const v = evaluate(node.arg, env);
      switch (node.op) {
        case "-": return -v;
        case "+": return +v;
        case "!": return v ? 0 : 1;
      }
      break;
    }
    case "BinOp": {
      if (node.op === "&&") return evaluate(node.left, env) ? evaluate(node.right, env) : 0;
      if (node.op === "||") { const l = evaluate(node.left, env); return l ? l : evaluate(node.right, env); }
      const a = evaluate(node.left, env);
      const b = evaluate(node.right, env);
      switch (node.op) {
        case "+": return a + b;
        case "-": return a - b;
        case "*": return a * b;
        case "/": return a / b;
        case "%": return a % b;
        case "^": return Math.pow(a, b);
        case "<": return a < b ? 1 : 0;
        case "<=": return a <= b ? 1 : 0;
        case ">": return a > b ? 1 : 0;
        case ">=": return a >= b ? 1 : 0;
        case "==": return a === b ? 1 : 0;
        case "!=": return a !== b ? 1 : 0;
      }
      break;
    }
    case "CondExpr":
      return evaluate(node.test, env) ? evaluate(node.then, env) : evaluate(node.otherwise, env);
    case "CallExpr": {
      const fn = FUNCTIONS[node.callee];
      if (fn === undefined) throw new ReferenceError("unknown function " + node.callee);
      return fn(...node.args.map((a) => evaluate(a, env)));
    }
  }
  throw new Error("bad node " + node.type + (node.op ? " " + node.op : ""));
}

export function main(input) {
  const ast = new Parser(FORMULA).parse();
  return input.map((env) => {
    try {
      return { ok: evaluate(ast, env) };
    } catch (e) {
      return { error: e.name + ": " + e.message };
    }
  });
}

export const inputs = [[],[{"base":0,"rate":0,"years":0,"fee":0,"cap":0,"bonus":0,"penalty":0}],[{"base":100,"rate":5,"years":10,"fee":1,"cap":1000,"bonus":0}],[{"base":2.25,"rate":1.5,"years":3,"fee":0.5,"cap":10,"bonus":1,"penalty":0},{"base":1000000,"rate":100,"years":30,"fee":0,"cap":1e+300,"bonus":0,"penalty":-13}],[{"base":3260,"rate":13,"years":7,"fee":58,"cap":38331,"bonus":420,"penalty":-36},{"base":2607,"rate":14,"years":17,"fee":77,"cap":11044,"bonus":65,"penalty":-12},{"base":8357,"rate":1,"years":6,"fee":117,"cap":33279,"bonus":392,"penalty":29},{"base":3663,"rate":-5,"years":1,"fee":126,"cap":19470,"bonus":145,"penalty":-27},{"base":3628,"rate":1,"years":8,"fee":143,"cap":19033,"bonus":451,"penalty":-42},{"base":3068,"rate":2,"years":12,"fee":118,"cap":12536,"bonus":239,"penalty":-10},{"base":1263,"rate":6,"years":9,"fee":166,"cap":48213,"bonus":203,"penalty":16},{"base":8823,"rate":10,"years":22,"fee":63,"cap":40968,"bonus":285,"penalty":26},{"base":6220,"rate":17,"years":23,"fee":106,"cap":3634,"bonus":265,"penalty":14},{"base":8913,"rate":5,"years":24,"fee":10,"cap":40618,"bonus":484,"penalty":49}],[{"base":1533,"rate":11,"years":24,"fee":88,"cap":7752,"bonus":259,"penalty":1},{"base":4375,"rate":3,"years":15,"fee":170,"cap":6612,"bonus":451,"penalty":44},{"base":1294,"rate":10,"years":1,"fee":192,"cap":31440,"bonus":50,"penalty":-9},{"base":5811,"rate":-3,"years":26,"fee":109,"cap":11431,"bonus":476,"penalty":46},{"base":2161,"rate":15,"years":26,"fee":152,"cap":36726,"bonus":331,"penalty":-10},{"base":4534,"rate":5,"years":8,"fee":78,"cap":21469,"bonus":108,"penalty":-5},{"base":2656,"rate":3,"years":19,"fee":12,"cap":32906,"bonus":205,"penalty":-45},{"base":4477,"rate":15,"years":3,"fee":111,"cap":9279,"bonus":94,"penalty":20},{"base":2534,"rate":-5,"years":24,"fee":67,"cap":15456,"bonus":455,"penalty":49},{"base":3769,"rate":-4,"years":19,"fee":87,"cap":3379,"bonus":379,"penalty":44},{"base":248,"rate":7,"years":13,"fee":180,"cap":33975,"bonus":241,"penalty":-47},{"base":4639,"rate":8,"years":24,"fee":164,"cap":2165,"bonus":275,"penalty":0},{"base":4393,"rate":15,"years":8,"fee":137,"cap":18403,"bonus":448,"penalty":35},{"base":2233,"rate":8,"years":2,"fee":92,"cap":28190,"bonus":331,"penalty":41},{"base":7036,"rate":-2,"years":16,"fee":26,"cap":2897,"bonus":68,"penalty":6},{"base":8117,"rate":4,"years":10,"fee":193,"cap":48334,"bonus":4,"penalty":48},{"base":4661,"rate":3,"years":3,"fee":186,"cap":31384,"bonus":127,"penalty":-41},{"base":8252,"rate":20,"years":24,"fee":80,"cap":22721,"bonus":257,"penalty":36},{"base":2063,"rate":18,"years":12,"fee":55,"cap":3687,"bonus":490,"penalty":-6},{"base":7253,"rate":20,"years":28,"fee":155,"cap":12963,"bonus":143,"penalty":29},{"base":2830,"rate":17,"years":14,"fee":160,"cap":29977,"bonus":428,"penalty":-24},{"base":5590,"rate":-5,"years":6,"fee":24,"cap":31746,"bonus":390,"penalty":-5},{"base":8356,"rate":4,"years":15,"fee":196,"cap":11306,"bonus":42,"penalty":-25},{"base":3916,"rate":0,"years":7,"fee":106,"cap":4335,"bonus":210,"penalty":-42},{"base":9544,"rate":19,"years":11,"fee":94,"cap":26132,"bonus":420,"penalty":35},{"base":9362,"rate":8,"years":4,"fee":30,"cap":27026,"bonus":148,"penalty":2},{"base":5569,"rate":5,"years":10,"fee":97,"cap":38708,"bonus":258,"penalty":-33},{"base":3180,"rate":0,"years":16,"fee":45,"cap":45662,"bonus":151,"penalty":-39},{"base":2397,"rate":-5,"years":21,"fee":3,"cap":1850,"bonus":37,"penalty":-2},{"base":9886,"rate":5,"years":17,"fee":68,"cap":44613,"bonus":205,"penalty":-13},{"base":1794,"rate":15,"years":19,"fee":196,"cap":21979,"bonus":137,"penalty":23},{"base":5223,"rate":-4,"years":22,"fee":70,"cap":10603,"bonus":489,"penalty":-34},{"base":5846,"rate":1,"years":23,"fee":114,"cap":4876,"bonus":318,"penalty":-36},{"base":3639,"rate":7,"years":18,"fee":33,"cap":8189,"bonus":412,"penalty":26},{"base":9502,"rate":9,"years":5,"fee":136,"cap":9329,"bonus":68,"penalty":-4},{"base":2073,"rate":6,"years":28,"fee":38,"cap":29067,"bonus":285,"penalty":-26},{"base":4368,"rate":4,"years":2,"fee":26,"cap":4789,"bonus":21,"penalty":-20},{"base":6976,"rate":18,"years":25,"fee":115,"cap":30302,"bonus":174,"penalty":19},{"base":9484,"rate":13,"years":26,"fee":130,"cap":12627,"bonus":-9,"penalty":0},{"base":48,"rate":17,"years":15,"fee":178,"cap":26732,"bonus":249,"penalty":-30},{"base":6680,"rate":19,"years":25,"fee":63,"cap":29473,"bonus":89,"penalty":-7},{"base":7852,"rate":2,"years":5,"fee":81,"cap":31125,"bonus":202,"penalty":3},{"base":563,"rate":16,"years":1,"fee":78,"cap":14435,"bonus":377,"penalty":-44},{"base":7939,"rate":15,"years":6,"fee":151,"cap":35288,"bonus":296,"penalty":-20},{"base":10000,"rate":18,"years":18,"fee":110,"cap":39462,"bonus":91,"penalty":-7},{"base":5675,"rate":-5,"years":11,"fee":152,"cap":47252,"bonus":138,"penalty":-23},{"base":2901,"rate":17,"years":17,"fee":177,"cap":42408,"bonus":489,"penalty":-27},{"base":3034,"rate":16,"years":20,"fee":154,"cap":5480,"bonus":446,"penalty":-3},{"base":4301,"rate":3,"years":13,"fee":28,"cap":29347,"bonus":96,"penalty":8},{"base":9173,"rate":12,"years":6,"fee":44,"cap":12164,"bonus":410,"penalty":47},{"base":2042,"rate":16,"years":12,"fee":166,"cap":11153,"bonus":209,"penalty":-17},{"base":1757,"rate":18,"years":28,"fee":37,"cap":42652,"bonus":49,"penalty":17},{"base":6362,"rate":7,"years":24,"fee":136,"cap":18001,"bonus":204,"penalty":45},{"base":3432,"rate":4,"years":24,"fee":82,"cap":18198,"bonus":-1,"penalty":26},{"base":6938,"rate":9,"years":20,"fee":44,"cap":22942,"bonus":53,"penalty":12},{"base":4316,"rate":15,"years":14,"fee":29,"cap":38917,"bonus":21,"penalty":26},{"base":8599,"rate":6,"years":22,"fee":186,"cap":41349,"bonus":20,"penalty":-27},{"base":4391,"rate":4,"years":20,"fee":129,"cap":36142,"bonus":177,"penalty":-14},{"base":9441,"rate":0,"years":0,"fee":192,"cap":33082,"bonus":252,"penalty":28},{"base":3933,"rate":15,"years":11,"fee":139,"cap":19718,"bonus":59,"penalty":10}]];
