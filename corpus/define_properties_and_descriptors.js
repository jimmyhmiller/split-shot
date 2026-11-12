// inputs: [0, 1, "k"]
// forbid-main: getOwnPropertyDescriptors|Object\.create|m\.type|c\.lazy
// `Object.getOwnPropertyDescriptors` of an ordinary object, `Object.defineProperties`
// and `Object.create(proto, props)` are modeled: each own property's descriptor,
// in key order (a non-enumerable one and an accessor kept as they are), and
// the definitions of the enumerable ones, all or none (zod's `mergeDefs` and
// `objectClone`). A definition the model does not decide (here a TypeError
// redefining a read-only property after another was defined) leaves the
// whole call to the runtime, which defines the first and then throws.
const def = { type: "string", checks: [] };
Object.defineProperty(def, "hidden", { value: 7, enumerable: false });
Object.defineProperty(def, "lazy", { get() { return "L"; }, enumerable: true, configurable: true });
def[2] = "two";
function mergeDefs(...defs) {
  const merged = {};
  for (const d of defs) Object.assign(merged, Object.getOwnPropertyDescriptors(d));
  return Object.defineProperties({}, merged);
}
const m = mergeDefs(def, { extra: 1 });
const c = Object.create(Object.getPrototypeOf(def), Object.getOwnPropertyDescriptors(def));
const bare = Object.create(null, { only: { value: "o", enumerable: true } });
function partly() {
  const half = {};
  Object.defineProperty(half, "x", { value: 1 });
  let thrown = "none";
  try {
    Object.defineProperties(half, { y: { value: 2, enumerable: true }, x: { value: 3 } });
  } catch (e) {
    thrown = e.name;
  }
  return [thrown, half.y, half.x];
}
function main(i) {
  return [
    m.type, m.hidden, m.lazy, m.extra, Object.keys(m).join(), c.type, c.lazy, c[2],
    Object.getOwnPropertyDescriptor(m, "hidden").enumerable, Object.getPrototypeOf(bare), bare.only,
    i in m, i === 1 ? partly() : "skip",
  ];
}
