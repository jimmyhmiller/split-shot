// inputs: [0, 2, 5]
// after: [globalThis.delObj.a, "b" in globalThis.delObj, globalThis.delFrozen.x].join("|")
// `delete` used for its value: true when the property is gone (or was never
// there), false for a non-configurable one in sloppy code (which also must
// not be removed: it was, statically), a TypeError in strict code.
function main(n) {
  const o = { a: 1, b: 2 };
  const r1 = delete o.b;
  const r2 = delete o.zzz;
  const fz = {};
  Object.defineProperty(fz, "x", { value: n, configurable: false });
  const r3 = delete fz.x;
  delete fz.x;
  const r4 = fz.x;
  const arr = [1, 2, 3];
  const r5 = delete arr[1];
  const r6 = (delete arr.length);
  let strictThrew = "no";
  (function () { "use strict"; try { delete fz.x; } catch (e) { strictThrew = e instanceof TypeError; } })();
  const dyn = JSON.parse('{"k":' + n + '}');
  const r7 = delete dyn.k;
  const r8 = delete (n + 1);
  const t = { p: { q: 1, keep: 2 } };
  const none = n > 100 ? t : null;
  const c1 = delete none?.p.q;
  const c2 = delete t?.p.q;
  delete t?.p.keep;
  const c3 = delete none?.p;
  globalThis.delObj = o;
  globalThis.delFrozen = fz;
  return [r1, r2, r3, r4, r5, 1 in arr, arr.length, r6, strictThrew, r7, "k" in dyn, r8, c1, c2, c3, JSON.stringify(t)].join("|");
}
