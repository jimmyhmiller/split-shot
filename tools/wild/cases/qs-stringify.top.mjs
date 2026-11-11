import qs from "qs";
const OPTIONS = { arrayFormat: "brackets", skipNulls: true, addQueryPrefix: true, sort: (a, b) => a.localeCompare(b) };
export function main(input) { return qs.stringify(input, OPTIONS); }
export const inputs = [
  { q: "split shot", page: 2, tags: ["a", "b"] },
  { filter: { price: { gte: 10, lte: 99 } }, x: null },
  {},
  { "é": "ü ñ", emoji: "😀" },
  "plain string",
  null,
  { a: [1, [2, 3]], b: { c: true } },
];
