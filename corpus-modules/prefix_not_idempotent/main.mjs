// What `main` does before its input matters, run at load only when a second
// run does what the first did. A counter it bumps there does not: the second
// run leaves 2 where the first left 1, so it stays runtime state, and each
// call sees what the one before left.
const counter = { n: 0 };
const table = { rows: null };
export function main(input) {
  counter.n += 1;
  table.rows = ["a", "b"];
  return [counter.n, table.rows.length, input ? "yes" : "no"];
}
