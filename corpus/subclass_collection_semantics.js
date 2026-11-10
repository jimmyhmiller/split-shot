// inputs: [0, 1, -3, 2.5]
// Classes extending Set and Map: their instances are modeled (fields,
// inherited and overridden methods, `super.m`, iteration, `size`,
// instanceof, getPrototypeOf), and made at runtime with their prototype and
// fields when they escape.
function main(x) {
  class Queue extends Set {
    onNew = new Set();
    tag = "q";
    enqueue(j) { this.add(j); return this.size; }
    shift() {
      const [job] = this;
      this.delete(job);
      return job;
    }
    get length() { return this.size; }
  }
  class Counting extends Set {
    added = 0;
    add(v) { this.added += 1; return super.add(v); }
    get size() { return super.size * 10; }
  }
  class Keyed extends Map {
    constructor(entries) { super(entries); this.reads = 0; }
    get(k) { this.reads++; return super.get(String(k).toLowerCase()); }
  }
  const out = [];
  const q = new Queue();
  out.push(q.enqueue({ j: x }), q.enqueue({ j: 2 }), q.length, q.tag, q.onNew.size);
  out.push(q.shift().j, q.length, q instanceof Queue, q instanceof Set, Object.getPrototypeOf(q) === Queue.prototype);
  let sum = 0;
  for (const e of q) sum += e.j;
  out.push(sum, [...q].length);
  const c = new Counting();
  c.add(x);
  c.add(x);
  c.add(7);
  out.push(c.added, c.has(7), c.size);
  const k = new Keyed([["a", x], ["b", 2]]);
  out.push(k.get("A"), k.get("B"), k.reads, k.size, k instanceof Map);
  globalThis.__q = q;
  globalThis.__c = c;
  globalThis.__k = k;
  out.push(globalThis.__q.length, globalThis.__q.tag, globalThis.__q instanceof Queue, globalThis.__q.shift().j, globalThis.__q.onNew instanceof Set);
  out.push(globalThis.__c.size, globalThis.__c.added, globalThis.__k.get("A"), globalThis.__k.reads);
  return out.join("|");
}
