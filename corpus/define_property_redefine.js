// inputs: [1, "q", 0]
// Object.defineProperty over an existing own property (a literal getter replaced, data to accessor and back, attributes only, a non-configurable property that must throw), as ValidateAndApplyPropertyDescriptor merges.
function desc(o, k) { const d = Object.getOwnPropertyDescriptor(o, k); return d ? Object.keys(d).sort().map(f => f + "=" + (typeof d[f] === "function" ? "fn" : d[f])).join(",") : "none"; }
function main(x) {
  const out = [];
  const s = "hello";
  const a = { type: 1, get t() { return s.slice(0, 2); } };
  Object.defineProperty(a, "t", { configurable: true, get: () => s + x });
  out.push(a.t, desc(a, "t"));
  const b = { v: 1 };
  Object.defineProperty(b, "v", { get: () => 7 });
  out.push(b.v, desc(b, "v"));
  const c = { get w() { return 3; } };
  Object.defineProperty(c, "w", { value: x });
  out.push(c.w, desc(c, "w"));
  const d = { z: 1 };
  Object.defineProperty(d, "z", { enumerable: false });
  out.push(d.z, desc(d, "z"), Object.keys(d).length);
  const e = {};
  Object.defineProperty(e, "q", { value: 1, configurable: false, writable: false });
  try { Object.defineProperty(e, "q", { value: 2 }); out.push("no throw"); } catch (err) { out.push(err.constructor.name); }
  try { Object.defineProperty(e, "q", { value: 1 }); out.push("same ok"); } catch (err) { out.push(err.constructor.name); }
  try { Object.defineProperty(e, "q", { get: () => 1 }); out.push("no throw"); } catch (err) { out.push(err.constructor.name); }
  const f = { k: 1 };
  Object.defineProperty(f, "k", { writable: false });
  try { "use strict"; f.k = 5; } catch (err) {}
  out.push(f.k, desc(f, "k"));
  return out;
}
