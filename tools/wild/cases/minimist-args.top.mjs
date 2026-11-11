import minimist from "minimist";
const OPTIONS = { boolean: ["verbose", "help"], string: ["name"], alias: { v: "verbose", h: "help", n: "name" }, default: { port: 8080 }, "--": true };
export function main(input) { return minimist(input, OPTIONS); }
export const inputs = [
  ["-v", "--name", "é", "--port=9000", "file.txt"],
  ["--no-verbose", "-n", "007", "--", "rest", "-x"],
  [],
  ["-abc", "--a.b.c", "1", "--x", "--y=", "-n5"],
  ["--__proto__.polluted", "yes", "--port", "0x10"],
  [5, true],
];
