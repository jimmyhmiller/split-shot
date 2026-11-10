// inputs: [0, 1, 3]
// forbid-return: Symbol|PropertyKeyMap|Pair|next
// Properties keyed by a symbol known statically (a well-known one, or
// Symbol.for of a string) are modeled: an iterator method a class defines
// or its prototype gets assigned (engine262's PropertyKeyMap), toStringTag,
// toPrimitive, hasInstance, a registry symbol, spread copying symbol keys.
// Defining one used to make the object a runtime value.
function main(x) {
  class PropertyKeyMap {
    #keys = [];
    #vals = [];
    set(k, v) { this.#keys.push(k); this.#vals.push(v); return this; }
    *entries() { for (let i = 0; i < this.#keys.length; i++) yield [this.#keys[i], this.#vals[i]]; }
  }
  PropertyKeyMap.prototype[Symbol.toStringTag] = "PropertyKeyMap";
  PropertyKeyMap.prototype[Symbol.iterator] = PropertyKeyMap.prototype.entries;
  const m = new PropertyKeyMap().set("a", x).set("b", 2);
  let sum = 0;
  for (const [, v] of m) sum += v;
  class Pair {
    constructor(a, b) { this.a = a; this.b = b; }
    *[Symbol.iterator]() { yield this.a; yield this.b; }
    [Symbol.toPrimitive](hint) { return hint === "number" ? this.a + this.b : "pair"; }
    static [Symbol.hasInstance](v) { return v === 42; }
  }
  const p = new Pair(x, 5);
  const meta = Symbol.for("meta");
  const tagged = { [meta]: x + 1, plain: 1 };
  const copy = { ...tagged };
  const out = [
    sum,
    [...p].join("+"),
    +p,
    `${p}`,
    42 instanceof Pair,
    p instanceof Pair,
    Object.prototype.toString.call(m),
    tagged[Symbol.for("meta")],
    copy[meta],
    Object.keys(copy).join(","),
    typeof meta,
  ];
  globalThis.__m = m;
  globalThis.__p = p;
  out.push([...globalThis.__m].length, [...globalThis.__p].length, String(globalThis.__m));
  return out.join("|");
}
