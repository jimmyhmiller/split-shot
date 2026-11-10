// inputs: [0, 1, -3, 2.5]
function main(x) {
  class Stack extends Array {
    constructor(length = 0) { super(+length); }
    top() { return this[this.length - 1]; }
  }
  class Loud extends Array {
    toString() { return "loud" + this.length; }
    toJSON() { return { n: this.length }; }
    get 5() { return "five"; }
  }
  class Iter extends Array {
    *[Symbol.iterator]() { yield 42; }
  }
  const out = [];
  const s = new Stack();
  s.push(1, 2, 3);
  out.push(s.top(), s.length, s instanceof Stack, s instanceof Array, Array.isArray(s));
  out.push(Object.getPrototypeOf(s) === Stack.prototype);
  const m = s.map((v) => v * x);
  out.push(m instanceof Stack, m.length, m[1], m.constructor === Stack);
  const sl = s.slice(1);
  out.push(sl instanceof Stack, sl.join("-"));
  const l = new Loud();
  l.push(x);
  out.push("" + l, JSON.stringify(l), l[5], `${l}`);
  const it = new Iter();
  it.push(1, 2);
  out.push([...it].join(","), new Set(it).size);
  const keep = new Stack(2);
  keep[0] = x;
  globalThis.__keep = keep;
  out.push(globalThis.__keep.top(), globalThis.__keep.length, globalThis.__keep instanceof Stack);
  const c = s.concat([9]);
  out.push(c instanceof Stack, c.length);
  out.push(s.pop(), s.shift(), s.length);
  return out.join("|");
}
