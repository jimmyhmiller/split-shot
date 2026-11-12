// style: npm filtrex (Jison-parsed expression compiled to JS source, run through new Function)
// filtrex compiles a fixed filter expression at load (its parser emits JS text
// that it turns into a function with `new Function`); main runs it on every
// row of the input and keeps the ids of the rows that pass and their weight.
import { compileExpression } from "filtrex";
const FILTER = compileExpression(
  `(kind == "fruit" or kind == "nut") and price < 10 and not (name in ("durian", "ackee"))
   and (qty mod 2 == 0 or qty > 20) and (if organic then 1.5 else 1) * qty * weight >= 3`,
);
const WEIGHT = compileExpression(
  `round((if organic then 1.5 else 1) * qty * weight * 100) / 100 + max(0, 5 - price) ^ 2`,
);
export function main(input) {
  const out = [];
  for (const row of input.rows) {
    if (FILTER(row) === true) out.push([row.id, WEIGHT(row)]);
  }
  return out;
}
export const inputs = [
  { rows: [] },
  { rows: [{ id: 1, kind: "fruit", name: "apple", price: 2, qty: 4, weight: 0.2, organic: false }] },
  { rows: [{ id: 2, kind: "fruit", name: "durian", price: 9, qty: 30, weight: 2, organic: true }] },
  { rows: [
    { id: 3, kind: "nut", name: "almond", price: 8, qty: 21, weight: 0.1, organic: true },
    { id: 4, kind: "veg", name: "kale", price: 3, qty: 10, weight: 1, organic: true },
    { id: 5, kind: "fruit", name: "pear", price: 11, qty: 2, weight: 5, organic: false },
  ] },
  { rows: [
    { id: 6, kind: "fruit", name: "fig", price: 4.5, qty: 6, weight: 0.5, organic: true },
    { id: 7, kind: "nut", name: "pecan", price: 9.99, qty: 40, weight: 0.05, organic: false },
    { id: 8, kind: "fruit", name: "ackee", price: 1, qty: 8, weight: 3, organic: false },
    { id: 9, kind: "fruit", name: "kiwi", price: 0.5, qty: 12, weight: 0.3, organic: false },
    { id: 10, kind: "nut", name: "cashew", price: 7, qty: 3, weight: 2, organic: true },
    { id: 11, kind: "fruit", name: "mango", price: 2.25, qty: 22, weight: 0.4, organic: true },
    { id: 12, kind: "fruit", name: "lime", price: 0.2, qty: 100, weight: 0.05, organic: false },
  ] },
  { rows: [
    { id: 13, kind: "nut", name: "walnut", price: 5, qty: 0, weight: 9, organic: true },
    { id: 14, kind: "fruit", name: "plum", price: 3, qty: 18, weight: 0.25, organic: true },
  ] },
];
