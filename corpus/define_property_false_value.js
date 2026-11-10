// inputs: [0, 1]
// An object whose own properties are defined (not assigned) keeps a data
// property whose value is `false`: of a descriptor's fields only the
// attributes default to `false` (a value defaults to `undefined`).
function Rec(flag) { this.flag = flag; }
const proto = Object.freeze({ kind: "p" });
const made = [];
for (const f of [true, false]) {
  const o = Object.create(proto);
  Object.defineProperty(o, "flag", { value: f, writable: true, enumerable: true, configurable: true });
  Object.defineProperty(o, "kind", { value: false, writable: false, enumerable: true, configurable: false });
  made.push(o);
}
function main(i) {
  const o = made[i];
  return [o.flag, o.kind, Object.getOwnPropertyDescriptor(o, "kind").value, JSON.stringify(o)];
}
