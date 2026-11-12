// inputs: [0, 1]
// forbid-main: Object\.create|\.k\b
// `Object.create(proto, props)` is `Object.create(proto)` given `props`'s
// definitions, for every prototype `Object.create(proto)` is modeled for
// (null, a modeled object, `Object.prototype` and the other standard
// prototypes); `props` undefined is no definitions.
const base = { greet() { return "hi " + this.k; } };
const a = Object.create(Object.prototype, { k: { value: 1, enumerable: true } });
const b = Object.create(base, { k: { value: "b", writable: true } });
const c = Object.create(null, { k: { get() { return "got"; }, enumerable: true } });
const d = Object.create(Array.prototype, { k: { value: 4 } });
const e = Object.create(base, undefined);
e.k = "e";
function main(i) {
  return [a.k, Object.keys(a).join(), b.greet(), Object.keys(b).length, c.k, Object.getPrototypeOf(c) === null,
    d.k, typeof d.push, e.greet(), Object.getPrototypeOf(a) === Object.prototype, i];
}
