import { sprintf } from "sprintf-js";
export function main(input) {
  return sprintf("%(name)-10s|%(count)04d|%(ratio).3f|%(flag)t", input);
}
export const inputs = [
  { name: "é", count: 7, ratio: 0.5, flag: true },
  { name: "a very long name", count: -12, ratio: 1e3, flag: 0 },
  { name: "", count: 0, ratio: 0, flag: false },
  { name: "x", count: "seven", ratio: 1, flag: true },
  {},
];
