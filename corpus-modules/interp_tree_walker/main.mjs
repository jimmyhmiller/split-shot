// A tree-walking interpreter over a fixed AST compiles to the program: the
// recursion over static syntax nodes unfolds, the `Map` environment (whose
// first iteration declares variables: the whistle lets that loop run once
// more, see `whistle_with`) keeps its values in variables of their own, and
// `return` by exception needs no runtime `try`: the handler throws any
// runtime exception again as it is (see `rethrows_foreign`).
class ReturnSignal {
  constructor(value) { this.value = value; }
}
const num = (value) => ({ type: "Num", value });
const id = (name) => ({ type: "Id", name });
const bin = (op, left, right) => ({ type: "Bin", op, left, right });
const set = (name, value) => ({ type: "Set", name, value });
const PROGRAM = { type: "Block", body: [
  set("acc", num(0)),
  set("i", num(0)),
  { type: "While", test: bin("<", id("i"), id("n")), body: { type: "Block", body: [
    set("acc", bin("+", id("acc"), bin("*", id("i"), id("i")))),
    set("i", bin("+", id("i"), num(1))),
  ] } },
  { type: "Return", value: id("acc") },
] };
function evaluate(node, env) {
  switch (node.type) {
    case "Num": return node.value;
    case "Id":
      if (!env.has(node.name)) throw new ReferenceError("undefined " + node.name);
      return env.get(node.name);
    case "Bin": {
      const l = evaluate(node.left, env), r = evaluate(node.right, env);
      switch (node.op) {
        case "+": return l + r;
        case "*": return l * r;
        case "<": return l < r ? 1 : 0;
        default: throw new Error("op " + node.op);
      }
    }
    default: throw new Error("expr " + node.type);
  }
}
function execute(node, env) {
  switch (node.type) {
    case "Block": for (const s of node.body) execute(s, env); return;
    case "Set": env.set(node.name, evaluate(node.value, env)); return;
    case "While": while (evaluate(node.test, env)) execute(node.body, env); return;
    case "Return": throw new ReturnSignal(evaluate(node.value, env));
    default: throw new Error("stmt " + node.type);
  }
}
export function main(input) {
  const env = new Map([["n", input | 0]]);
  try {
    execute(PROGRAM, env);
  } catch (e) {
    if (e instanceof ReturnSignal) return e.value;
    throw e;
  }
  return null;
}
