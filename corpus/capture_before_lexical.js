// inputs: [0, 2, 5]
// after: [globalThis.lex.check(), globalThis.lex.mk().v, globalThis.lex.read()].join("|")
// A closure made before a `const`/`let`/`class` it refers to reads the
// binding once it is initialized (it was resolved as a global).
function main(n) {
  function make() {
    class Version {
      constructor(m) { this.m = m; }
      isZero() { return this.m === zero.m; }
    }
    const zero = new Version(n);
    return Version;
  }
  const V = make();
  function make2() {
    const mk = () => new Later(n + 1);
    const read = () => limit * 2;
    class Later { constructor(v) { this.v = v; } }
    let limit = n + 3;
    return { mk, read };
  }
  const m2 = make2();
  const check = () => new V(n).isZero();
  globalThis.lex = { check, mk: m2.mk, read: m2.read };
  return [new V(n).isZero(), new V(n + 1).isZero(), m2.mk().v, m2.read()].join("|");
}
