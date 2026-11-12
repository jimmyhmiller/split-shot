// style: npm jexl (lexer + state-machine parser to an AST, evaluator dispatching handlers[ast.type], PromiseSync for evalSync)
// residue: \b(FilterExpression|BinaryExpression|ConditionalExpression|FunctionCall|UnaryExpression)\b
// jexl compiling a fixed expression at load (with transforms registered on
// its own instance): the paid orders over a threshold, their total and a
// label. main evaluates it synchronously against the input.
import jexl from "jexl";
const JEXL = new jexl.Jexl();
JEXL.addTransform("sum", (xs, key) => xs.reduce((acc, x) => acc + x[key], 0));
JEXL.addTransform("pluck", (xs, key) => xs.map((x) => x[key]));
JEXL.addTransform("join", (xs, sep) => xs.join(sep));
JEXL.addTransform("upper", (s) => s.toUpperCase());
JEXL.addFunction("max", Math.max);
const EXPR = JEXL.compile(`{
  ids: orders[.status == 'paid' && .amount >= minAmount]|pluck('id'),
  total: orders[.status == 'paid' && .amount >= minAmount]|sum('amount'),
  names: (orders[.status == 'paid' && .amount >= minAmount]|pluck('customer')|join(', '))|upper,
  label: orders[.status == 'paid']|sum('amount') > 100 ? 'big' : (orders|sum('amount') > 0 ? 'small' : 'none'),
  top: max(0, orders[.status != 'void']|sum('amount') - minAmount * 2),
  vip: customer.tier in ['gold', 'platinum'] && !customer.blocked
}`);
export function main(input) {
  return EXPR.evalSync(input);
}
export const inputs = [
  { orders: [], minAmount: 0, customer: { tier: "basic", blocked: false } },
  { orders: [{ id: 1, status: "paid", amount: 5, customer: "ann" }], minAmount: 10, customer: { tier: "gold", blocked: false } },
  { orders: [{ id: 2, status: "paid", amount: 50, customer: "bo" }, { id: 3, status: "void", amount: 70, customer: "cy" }], minAmount: 10, customer: { tier: "gold", blocked: true } },
  { orders: [
    { id: 4, status: "paid", amount: 120, customer: "di" },
    { id: 5, status: "open", amount: 30, customer: "ed" },
    { id: 6, status: "paid", amount: 15.5, customer: "flo" },
    { id: 7, status: "paid", amount: 9, customer: "gus" },
  ], minAmount: 15, customer: { tier: "platinum", blocked: false } },
  { orders: [
    { id: 8, status: "paid", amount: 1, customer: "hal" }, { id: 9, status: "paid", amount: 2, customer: "ivy" },
    { id: 10, status: "paid", amount: 3, customer: "jo" }, { id: 11, status: "void", amount: 4, customer: "kim" },
    { id: 12, status: "paid", amount: 50, customer: "lu" }, { id: 13, status: "open", amount: 60, customer: "mo" },
    { id: 14, status: "paid", amount: 70, customer: "ned" }, { id: 15, status: "paid", amount: 80, customer: "oz" },
  ], minAmount: 2, customer: { tier: "silver", blocked: false } },
  { orders: [{ id: 16, status: "open", amount: 0, customer: "pat" }], minAmount: 0, customer: {} },
];
