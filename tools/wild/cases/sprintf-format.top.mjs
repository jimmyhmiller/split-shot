import { vsprintf } from "sprintf-js";
const FORMAT = "%2$s has %1$05.2f units (%3$+d) [%4$'*8s] %5$j %6$x%%";
export function main(input) { return vsprintf(FORMAT, input); }
export const inputs = [
  [3.14159, "é", 7, "pad", { a: 1 }, 255],
  [0, "", -7, "longer than eight", [], 0],
  ["12", 5, "3", 4, null, 4095],
  [],
  ["NaN", "x", 1, "y", "z", "q"],
];
