// style: tree-walking AST of objects (switch on node.type, Map environment)
// residue: "(BlockStmt|WhileStmt|IfStmt|AssignStmt|ReturnStmt|BinaryExpr|LogicalExpr|Identifier|NumberLiteral)"
// A small imperative language (assignment, while, if, binary operators) running
// a fixed program: the count and the sum of the primes below n, by trial division.

const num = (value) => ({ type: "NumberLiteral", value });
const id = (name) => ({ type: "Identifier", name });
const bin = (op, left, right) => ({ type: "BinaryExpr", op, left, right });
const assign = (name, value) => ({ type: "AssignStmt", name, value });
const block = (...body) => ({ type: "BlockStmt", body });

// count = 0; sum = 0; i = 2;
// while (i < n) {
//   j = 2; prime = 1;
//   while (j * j <= i && prime) {
//     if (i % j == 0) prime = 0;
//     j = j + 1;
//   }
//   if (prime) { count = count + 1; sum = sum + i; }
//   i = i + 1;
// }
// return { count, sum };
const PROGRAM = block(
  assign("count", num(0)),
  assign("sum", num(0)),
  assign("i", num(2)),
  {
    type: "WhileStmt",
    test: bin("<", id("i"), id("n")),
    body: block(
      assign("j", num(2)),
      assign("prime", num(1)),
      {
        type: "WhileStmt",
        test: { type: "LogicalExpr", op: "&&", left: bin("<=", bin("*", id("j"), id("j")), id("i")), right: id("prime") },
        body: block(
          { type: "IfStmt", test: bin("==", bin("%", id("i"), id("j")), num(0)), consequent: assign("prime", num(0)), alternate: null },
          assign("j", bin("+", id("j"), num(1))),
        ),
      },
      {
        type: "IfStmt",
        test: id("prime"),
        consequent: block(
          assign("count", bin("+", id("count"), num(1))),
          assign("sum", bin("+", id("sum"), id("i"))),
        ),
        alternate: null,
      },
      assign("i", bin("+", id("i"), num(1))),
    ),
  },
  { type: "ReturnStmt", argument: { type: "ObjectExpr", keys: ["count", "sum"], values: [id("count"), id("sum")] } },
);

class ReturnSignal {
  constructor(value) {
    this.value = value;
  }
}

function evaluate(node, env) {
  switch (node.type) {
    case "NumberLiteral":
      return node.value;
    case "Identifier":
      if (!env.has(node.name)) throw new ReferenceError(`undefined variable ${node.name}`);
      return env.get(node.name);
    case "BinaryExpr": {
      const l = evaluate(node.left, env);
      const r = evaluate(node.right, env);
      switch (node.op) {
        case "+": return l + r;
        case "-": return l - r;
        case "*": return l * r;
        case "/": return l / r;
        case "%": return l % r;
        case "<": return l < r ? 1 : 0;
        case "<=": return l <= r ? 1 : 0;
        case ">": return l > r ? 1 : 0;
        case ">=": return l >= r ? 1 : 0;
        case "==": return l === r ? 1 : 0;
        case "!=": return l !== r ? 1 : 0;
        default: throw new Error(`unknown operator ${node.op}`);
      }
    }
    case "LogicalExpr": {
      const l = evaluate(node.left, env);
      if (node.op === "&&") return l ? evaluate(node.right, env) : l;
      if (node.op === "||") return l ? l : evaluate(node.right, env);
      throw new Error(`unknown logical operator ${node.op}`);
    }
    case "ObjectExpr": {
      const out = {};
      for (let k = 0; k < node.keys.length; k++) out[node.keys[k]] = evaluate(node.values[k], env);
      return out;
    }
    default:
      throw new Error(`unknown expression ${node.type}`);
  }
}

function execute(node, env) {
  switch (node.type) {
    case "BlockStmt":
      for (const stmt of node.body) execute(stmt, env);
      return;
    case "AssignStmt":
      env.set(node.name, evaluate(node.value, env));
      return;
    case "WhileStmt":
      while (evaluate(node.test, env)) execute(node.body, env);
      return;
    case "IfStmt":
      if (evaluate(node.test, env)) execute(node.consequent, env);
      else if (node.alternate) execute(node.alternate, env);
      return;
    case "ReturnStmt":
      throw new ReturnSignal(evaluate(node.argument, env));
    default:
      throw new Error(`unknown statement ${node.type}`);
  }
}

function run(program, globals) {
  const env = new Map(Object.entries(globals));
  try {
    execute(program, env);
  } catch (e) {
    if (e instanceof ReturnSignal) return e.value;
    throw e;
  }
  return null;
}

export function main(input) {
  return run(PROGRAM, { n: input.n });
}

export const inputs = [{ n: 0 }, { n: 2 }, { n: 3 }, { n: 30 }, { n: 120 }, { n: 200 }];
