// inputs: [0, 1, 2, 3, 4, 5, 6]
// Load-code state that runtime code writes only through what an accessor
// gives or takes (a getter's result, a setter's argument, a getter defined
// with `Object.defineProperty`), a collection's entry, a copy `assign`
// made, or a function called through `call`/`apply`, changes from one call
// of `main` to the next: none of it may be taken as known.
const make = () => {
  const s = { a: { n: 0 }, b: { n: 0 }, c: { n: 0 }, d: { n: 0 }, e: { n: 0 }, f: { n: 0 }, g: { n: 0 } };
  const viaGetter = { get inner() { return s.a; } };
  const viaSetter = { set slot(v) { v.n += 1; } };
  const defined = {};
  Object.defineProperty(defined, "inner", { get() { return s.c; } });
  const map = new Map([["k", s.d]]);
  const copy = Object.assign({}, { e: s.e });
  function bumpThis() { this.n += 1; }
  function bumpArg(o) { o.n += 1; }
  return { s, viaGetter, viaSetter, defined, map, copy, bumpThis, bumpArg };
};
const S = make();
function main(i) {
  switch (i % 7) {
    case 0: S.viaGetter.inner.n += 1; break;
    case 1: S.viaSetter.slot = S.s.b; break;
    case 2: S.defined.inner.n += 1; break;
    case 3: S.map.get("k").n += 1; break;
    case 4: S.copy.e.n += 1; break;
    case 5: S.bumpThis.call(S.s.f); break;
    case 6: S.bumpArg.apply(null, [S.s.g]); break;
  }
  const s = S.s;
  return [s.a.n, s.b.n, s.c.n, s.d.n, s.e.n, s.f.n, s.g.n];
}
