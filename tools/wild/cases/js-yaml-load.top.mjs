import { load, JSON_SCHEMA } from "js-yaml";
const OPTIONS = { schema: JSON_SCHEMA };
export function main(input) { return load(input, OPTIONS); }
export const inputs = [
  "a: 1\nb:\n  - x\n  - y: [1, 2, {z: null}]\n",
  "name: \"é\"\nmulti: |\n  line one\n  line two\n",
  "",
  "- 1\n- true\n- ~\n- 0x1f\n",
  "a: [unclosed",
  "&anchor a: 1\nb: *anchor\n",
  42,
];
