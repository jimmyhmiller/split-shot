import ini from "ini";
const OPTIONS = { section: "app", whitespace: true, sort: true };
export function main(input) { return ini.stringify(input, OPTIONS); }
export const inputs = [
  { name: "x", db: { host: "h", port: 1, pool: { max: 10 } } },
  { list: ["a", "b"], flag: true, n: null },
  {},
  { "é": "ü; not a comment", "k=": "v" },
  "string",
];
