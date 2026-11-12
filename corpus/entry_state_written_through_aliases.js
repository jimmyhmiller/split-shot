// inputs: [0, 1, 2, 3, 4, 5, 6]
// Objects the load code leaves that runtime code writes only through an
// alias (a callback's parameter, an element read back from an array, a
// method's `this`, a setter's argument, a property read back, a function's
// result, an object handed to a standard method) change from one call of
// `main` to the next: none of them may be taken as known. Each call bumps
// one of them and reports them all.
const make = () => {
  const counters = { a: { n: 0 }, b: { n: 0 }, c: { n: 0 }, d: { n: 0 }, e: { n: 0 }, f: { n: 0 }, g: { n: 0 } };
  const list = [counters.b];
  const holder = {
    target: counters.c,
    bump() { this.target.n += 1; },
  };
  const owner = {
    set slot(v) { v.n += 1; },
  };
  const box = { inner: counters.e };
  const pick = () => counters.f;
  const bump = (o) => { o.n += 1; };
  return { counters, list, holder, owner, box, pick, bump };
};
const S = make();
function main(i) {
  switch (i % 7) {
    case 0: [S.counters.a].forEach((o) => { o.n += 1; }); break;
    case 1: S.list[0].n += 1; break;
    case 2: S.holder.bump(); break;
    case 3: S.owner.slot = S.counters.d; break;
    case 4: S.box.inner.n += 1; break;
    case 5: S.pick().n += 1; break;
    case 6: [S.counters.g].map((o) => S.bump(o)); break;
  }
  const c = S.counters;
  return [c.a.n, c.b.n, c.c.n, c.d.n, c.e.n, c.f.n, c.g.n];
}
