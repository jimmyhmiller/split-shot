// style: tagged-array expression tree, if-chain on e[0] (jspe/examples/calc.interp.js)
// residue: "(num|add|mul|sub|neg)"
// The arithmetic-expression interpreter from jspe/examples/calc.interp.js
// (the first one split-shot's ancestor turned into a compiler), running a fixed
// polynomial expression at every point of the input array.

function interp(e, x) {
  if (e[0] === "num") { return e[1]; }
  if (e[0] === "x")   { return x; }
  if (e[0] === "add") { return interp(e[1], x) + interp(e[2], x); }
  if (e[0] === "mul") { return interp(e[1], x) * interp(e[2], x); }
  if (e[0] === "sub") { return interp(e[1], x) - interp(e[2], x); }
  if (e[0] === "neg") { return 0 - interp(e[1], x); }
  throw new Error("unknown node " + e[0]);
}

// (x^3 - 2x^2 + 3x - 5) * (x + 7) - (-(x * x) + 11) * (x - 1)
const X = ["x"];
const EXPR =
  ["sub",
    ["mul",
      ["sub",
        ["add",
          ["sub", ["mul", X, ["mul", X, X]], ["mul", ["num", 2], ["mul", X, X]]],
          ["mul", ["num", 3], X]],
        ["num", 5]],
      ["add", X, ["num", 7]]],
    ["mul",
      ["add", ["neg", ["mul", X, X]], ["num", 11]],
      ["sub", X, ["num", 1]]]];

export function main(input) {
  const out = [];
  for (const x of input.xs) out.push(interp(EXPR, x));
  return out;
}

export const inputs = [
  { xs: [] },
  { xs: [0] },
  { xs: [1, -1] },
  { xs: [0.5, 2.25, -3.75, 1e6] },
  { xs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31] },
  { xs: [-50, -49, -48, -47, -46, -45, -44, -43, -42, -41, -40, -39, -38, -37, -36, -35, -34, -33, -32, -31, -30, -29, -28, -27, -26, -25, -24, -23, -22, -21, -20, -19, -18, -17, -16, -15, -14, -13, -12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49] },
];
