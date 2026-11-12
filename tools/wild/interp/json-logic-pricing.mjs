// style: npm json-logic-js (JSON rule tree, op-name dispatch through an operations table and an if-chain)
// residue: \b(get_operator|is_logic)\b
// json-logic-js applying a fixed pricing rule to an order: the subtotal of
// the lines (reduce over map), a tier from the subtotal, a discount for
// members, free shipping over a threshold, and the names of the bulk lines.
import jsonLogic from "json-logic-js";
const SUBTOTAL = {
  "reduce": [
    { "map": [{ "var": "lines" }, { "*": [{ "var": "qty" }, { "var": "price" }] }] },
    { "+": [{ "var": "current" }, { "var": "accumulator" }] },
    0,
  ],
};
const PRICING = {
  "merge": [
    [SUBTOTAL],
    [{ "if": [
      { ">=": [SUBTOTAL, 500] }, "gold",
      { ">=": [SUBTOTAL, 100] }, "silver",
      { "<=": [SUBTOTAL, 0] }, "empty",
      "bronze",
    ] }],
    [{ "if": [
      { "and": [{ "var": "member" }, { ">": [SUBTOTAL, 50] }] },
      { "*": [SUBTOTAL, 0.1] },
      0,
    ] }],
    [{ "or": [{ ">": [SUBTOTAL, 250] }, { "in": [{ "var": "country" }, ["IS", "LI"]] }] }],
    { "map": [
      { "filter": [{ "var": "lines" }, { ">=": [{ "var": "qty" }, 10] }] },
      { "cat": [{ "var": "sku" }, "x", { "var": "qty" }] },
    ] },
    [{ "some": [{ "var": "lines" }, { "==": [{ "var": "price" }, 0] }] }],
    [{ "all": [{ "var": "lines" }, { "<": [0, { "var": "qty" }] }] }],
  ],
};
export function main(input) {
  return jsonLogic.apply(PRICING, input);
}
export const inputs = [
  { lines: [], member: false, country: "US" },
  { lines: [{ sku: "a", qty: 1, price: 9.5 }], member: true, country: "IS" },
  { lines: [{ sku: "a", qty: 12, price: 4 }, { sku: "b", qty: 2, price: 30 }], member: true, country: "DE" },
  { lines: [{ sku: "c", qty: 10, price: 0 }, { sku: "d", qty: 3, price: 199 }, { sku: "e", qty: 40, price: 1.25 }], member: false, country: "LI" },
  { lines: [{ sku: "f", qty: 0, price: 5 }], member: true, country: "FR" },
  { lines: [{ sku: "g", qty: 25, price: 7 }, { sku: "h", qty: 11, price: 3 }, { sku: "i", qty: 1, price: 80 }, { sku: "j", qty: 50, price: 2 }, { sku: "k", qty: 5, price: 15 }, { sku: "l", qty: 14, price: 9 }], member: true, country: "US" },
];
