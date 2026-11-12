// inputs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
// An object a standard constructor makes at runtime (`new Date(t)`) is known
// to be an instance of it with no own property, so `instanceof`, its
// `constructor` and `in` fold, and a standard method of it run on primitives
// changes none of that. Every way runtime code can give it another
// prototype or an own property, directly or through an alias, a call or a
// collection, undoes what is known from there on.
const K = Symbol.for("k");
function Other() {}
const hold = [];
function sneak(o) { Object.setPrototypeOf(o, Other.prototype); }
function main(i) {
  const d = new Date(i * 86400000);
  const m = new Map();
  const t0 = d.getTime();
  d.setUTCFullYear(2000 + i);
  m.set("a", i);
  const before = [d instanceof Date, d.constructor === Date, K in d, "getTime" in d, m instanceof Map, m instanceof Object, d instanceof Map, typeof d];
  switch (i % 16) {
    case 0: Object.setPrototypeOf(d, Other.prototype); break;
    case 1: Reflect.setPrototypeOf(d, Other.prototype); break;
    case 2: d.__proto__ = Other.prototype; break;
    case 3: d.constructor = Other; break;
    case 4: sneak(d); break;
    case 5: hold.push(d); Object.setPrototypeOf(hold[0], Other.prototype); hold.length = 0; break;
    case 6: Object.defineProperty(d, "constructor", { value: Other }); break;
    case 7: { const k = "__pro" + "to__"; d[k] = Other.prototype; break; }
    case 8: { const alias = d; alias.constructor = Map; break; }
    case 9: Object.assign(d, { constructor: Set }); break;
    case 10: d[K] = 1; break;
    case 11: Object.defineProperty(d, K, { value: 2 }); break;
    case 12: { m.set(d, 1); [...m.keys()][1].constructor = Other; break; }
    case 13: { const o = { d }; o.d.getTime = () => 99; break; }
    case 14: { const r = m.set("x", d); r.get("x")[K] = 3; break; }
    case 15: break;
  }
  const C = d.constructor;
  return [before, t0, K in d, d instanceof Date, d instanceof Other, C === Date, C === Other, C === Map, C === Set, typeof d.getTime, m.get("a")];
}
