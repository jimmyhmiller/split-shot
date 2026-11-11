import deepmerge from "deepmerge";
const DEFAULTS = { server: { port: 8080, hosts: ["localhost"], tls: { enabled: false } }, log: { level: "info" }, plugins: [] };
const OPTIONS = { arrayMerge: (_dest, source) => source };
export function main(input) { return deepmerge(DEFAULTS, input, OPTIONS); }
export const inputs = [
  { server: { port: 9000, tls: { enabled: true, cert: "c.pem" } } },
  { plugins: ["a", "b"], server: { hosts: [] } },
  {},
  { log: null, "é": { deep: [1, { x: 2 }] } },
  [1, 2],
  null,
];
