// inputs: [0, 1, 2, 3, 4, 5]
// A closure made on every call (an arrow inside a function that runs at
// runtime) is given the value of a variable that can no longer change (a
// function declaration, a `const` initialized before it is made) rather than
// the variable's cell; one assigned after, or read before its
// initialization, is still read where it is.
function stringify(v) { return typeof v === "bigint" ? v + "n" : JSON.stringify(v); }
function join(values, sep) {
  return values.map((v) => stringify(v)).join(sep);
}
function tally(values) {
  let total = 0;
  const add = (v) => { total += v; };
  values.forEach((v) => add(v));
  const read = () => total;
  total += 100;
  return read();
}
function early(flag) {
  const peek = () => late;
  if (flag) { try { return peek(); } catch (e) { return e.name; } }
  const late = "set";
  return peek();
}
function counter() {
  let n = 0;
  const fns = [];
  for (let i = 0; i < 3; i++) fns.push(() => n + i);
  n = 10;
  return fns.map((f) => f());
}
const sizes = { a: 1, b: 2 };
function size(k) { return sizes[k] ?? null; }
function main(i) {
  const xs = [i, "x" + i, i % 2 === 0, null];
  return [join(xs, "|"), tally([i, i + 1]), early(i % 2 === 1), counter(), ["a", "b", "c"].map((k) => size(k))];
}
