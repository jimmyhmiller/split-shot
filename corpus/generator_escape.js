// inputs: [0, 3, 7]
function* counter(start) { let i = start; while (true) { const reset = yield i; i = reset ? start : i + 1; } }
function main(n) {
  const g = counter(n);
  const it = counter(10);
  return [g.next().value, g.next().value, g.next(true).value, it.next().value, it.next().value, typeof g.next];
}
