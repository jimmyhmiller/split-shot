import equal from "fast-deep-equal";
const EXPECTED = { id: 7, tags: ["a", "b"], meta: { ok: true, n: null, nested: [{ x: 1 }] } };
export function main(input) { return equal(input, EXPECTED); }
export const inputs = [
  { id: 7, tags: ["a", "b"], meta: { ok: true, n: null, nested: [{ x: 1 }] } },
  { id: 7, tags: ["a", "b"], meta: { ok: true, n: null, nested: [{ x: 2 }] } },
  { meta: { nested: [{ x: 1 }], n: null, ok: true }, tags: ["a", "b"], id: 7 },
  {},
  null,
  { id: 7, tags: ["a", "b", "c"], meta: { ok: true, n: null, nested: [{ x: 1 }] } },
  "é",
];
