import { dump } from "js-yaml";
const OPTIONS = { indent: 2, sortKeys: true, lineWidth: 40, noRefs: true };
export function main(input) { return dump(input, OPTIONS); }
export const inputs = [
  { b: [1, 2, { c: null }], a: "text", n: 1.5, t: true },
  [],
  "just a string: with colon",
  { "é": "multi\nline\n", long: "word word word word word word word word word word word word word word word word word word word word " },
  null,
  { nested: { deep: { deeper: [[1, 2], [3]] } } },
];
