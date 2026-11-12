// style: npm jsep (ESTree-like AST) + a tree-walking evaluator (switch on node.type, operator switches)
// residue: "(BinaryExpression|LogicalExpression|ConditionalExpression|MemberExpression|CallExpression|UnaryExpression|Identifier|Literal)"
// jsep parses a fixed scoring expression inside main, on every call; a small evaluator
// of the usual shape (switch on node.type) runs it on every row of the
// input and keeps the rows that score above zero.
import jsep from "jsep";
const SOURCE =
  "row.active && row.tags.length > 0 ? " +
  "(row.price * row.qty - (row.price > 100 ? row.price * 0.15 : 0)) / max(1, row.qty) + " +
  "(row.tags[0] === 'sale' ? 10 : -1) * abs(row.delta % 7) : " +
  "-(row.qty || 1)";
const FUNCTIONS = { max: Math.max, min: Math.min, abs: Math.abs, floor: Math.floor };

function binary(op, a, b) {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return a / b;
    case "%": return a % b;
    case "<": return a < b;
    case ">": return a > b;
    case "<=": return a <= b;
    case ">=": return a >= b;
    case "==": return a == b;
    case "!=": return a != b;
    case "===": return a === b;
    case "!==": return a !== b;
    default: throw new Error("unknown binary operator " + op);
  }
}
function evaluate(node, scope) {
  switch (node.type) {
    case "Literal": return node.value;
    case "Identifier":
      if (node.name in scope) return scope[node.name];
      if (node.name in FUNCTIONS) return FUNCTIONS[node.name];
      throw new Error("unbound " + node.name);
    case "MemberExpression": {
      const obj = evaluate(node.object, scope);
      const key = node.computed ? evaluate(node.property, scope) : node.property.name;
      return obj[key];
    }
    case "UnaryExpression": {
      const v = evaluate(node.argument, scope);
      switch (node.operator) {
        case "-": return -v;
        case "+": return +v;
        case "!": return !v;
        default: throw new Error("unknown unary operator " + node.operator);
      }
    }
    case "BinaryExpression":
      if (node.operator === "&&") return evaluate(node.left, scope) && evaluate(node.right, scope);
      if (node.operator === "||") return evaluate(node.left, scope) || evaluate(node.right, scope);
      return binary(node.operator, evaluate(node.left, scope), evaluate(node.right, scope));
    case "LogicalExpression":
      if (node.operator === "&&") return evaluate(node.left, scope) && evaluate(node.right, scope);
      return evaluate(node.left, scope) || evaluate(node.right, scope);
    case "ConditionalExpression":
      return evaluate(node.test, scope) ? evaluate(node.consequent, scope) : evaluate(node.alternate, scope);
    case "CallExpression": {
      const fn = evaluate(node.callee, scope);
      const args = node.arguments.map((a) => evaluate(a, scope));
      return fn(...args);
    }
    case "ArrayExpression":
      return node.elements.map((e) => evaluate(e, scope));
    default:
      throw new Error("unsupported node " + node.type);
  }
}
export function main(input) {
  const AST = jsep(SOURCE);
  const out = [];
  for (const row of input.rows) {
    const score = evaluate(AST, { row });
    if (score > 0) out.push({ id: row.id, score });
  }
  return out;
}
export const inputs = [
  { rows: [] },
  { rows: [{ id: 1, active: false, qty: 0, price: 5, tags: [], delta: 3 }] },
  { rows: [{ id: 2, active: true, qty: 3, price: 20, tags: ["sale"], delta: 9 }] },
  { rows: [
    { id: 3, active: true, qty: 2, price: 150, tags: ["new", "x"], delta: -4 },
    { id: 4, active: true, qty: 0, price: 0, tags: ["sale"], delta: 0 },
    { id: 5, active: true, qty: 7, price: 12.5, tags: [], delta: 13 },
  ] },
  { rows: [
    { id: 6, active: true, qty: 1, price: 99, tags: ["sale"], delta: 6 },
    { id: 7, active: true, qty: 4, price: 101, tags: ["sale"], delta: 1 },
    { id: 8, active: false, qty: 9, price: 3, tags: ["sale"], delta: 2 },
    { id: 9, active: true, qty: 10, price: 1, tags: ["old"], delta: 70 },
    { id: 10, active: true, qty: 5, price: 250, tags: ["sale", "big"], delta: 15 },
    { id: 11, active: true, qty: 2, price: 40, tags: ["sale"], delta: 27 },
    { id: 12, active: true, qty: 3, price: 8, tags: ["misc"], delta: 5 },
    { id: 13, active: true, qty: 6, price: 60, tags: ["sale"], delta: 33 },
  ] },
  { rows: [
    { id: 14, active: true, qty: 1, price: 1000, tags: ["lux"], delta: -100 },
    { id: 15, active: true, qty: 12, price: 2, tags: ["sale"], delta: 4 },
  ] },
];
