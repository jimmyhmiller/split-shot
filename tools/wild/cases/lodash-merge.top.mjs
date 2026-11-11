import { merge, defaultsDeep, omit } from "lodash-es";
const DEFAULTS = { server: { port: 8080, hosts: ["localhost"] }, log: { level: "info", colors: true } };
export function main(input) {
  return { merged: merge({}, DEFAULTS, input), defaulted: omit(defaultsDeep({}, input, DEFAULTS), ["secret"]) };
}
export const inputs = [
  { server: { port: 9000 }, secret: "x" },
  { server: { hosts: ["a", "b"] }, log: null },
  {},
  { "é": [1, { a: 2 }] },
  null,
];
