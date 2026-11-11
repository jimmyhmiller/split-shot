import Fraction from "fraction.js";
const THIRD = new Fraction(1, 3);
export function main(input) {
  const f = new Fraction(input).mul(THIRD).add("1/6");
  return { text: f.toFraction(true), simple: f.simplify(0.01).toFraction(), n: f.valueOf() };
}
export const inputs = ["3/4", 0.125, "1.(3)", "-7", [22, 7], "x/y", "1/0", { n: 5, d: 10 }];
