// inputs: [1, 5, 2]
// A module object `main` writes is runtime state: the next call reads what
// the last one left (not the value the top-level code gave it), whether the
// write is a plain store, one through a method, or one a runtime call sees.
const cfg = { n: 0, items: [] };
const stats = { calls: 0, bump() { this.calls++; } };
function main(x) {
  const prev = cfg.n;
  cfg.n = x;
  cfg.items.push(x);
  stats.bump();
  return [prev, JSON.stringify(cfg), stats.calls];
}
