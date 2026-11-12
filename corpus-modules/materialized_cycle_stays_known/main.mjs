// A function whose binding it refers to itself through (a named function
// expression: a cell holding the function, the function capturing the cell)
// is made at runtime, when `main` needs it, by filling the cell with the
// function. That write leaves the cell as the load code left it, so it is no
// change a later call could see: the function stays known, and comparing
// against a fixed value unfolds over that value.
const equal = function eq(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!eq(a[i], b[i])) return false;
    return true;
  }
  return false;
};
const EXPECTED = [1, [2, 3]];
export function main(input) {
  return equal(input, EXPECTED);
}
