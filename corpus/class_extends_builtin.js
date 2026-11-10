// inputs: [0, 2, 5]
// A class extending a built-in (Map) whose constructor escapes to runtime:
// its residual body must hand back the object `super(...)` built.
function main(n) {
  class KeyedMap extends Map {
    constructor(entries, key = (d) => d) {
      super();
      this._key = key;
      if (entries != null) for (const [k, v] of entries) this.set(k, v);
    }
    get(k) { return super.get(this._key(k)); }
    set(k, v) { return super.set(this._key(k), v); }
  }
  globalThis.KeyedMap = KeyedMap;
  const entries = [];
  for (let i = 0; i < n; i++) entries.push(["K" + i, i]);
  const m = new globalThis.KeyedMap(entries, (s) => String(s).toLowerCase());
  return [m instanceof Map, m.get("k0"), m.get("K1"), m.size].join(":");
}
