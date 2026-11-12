// inputs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
// A `let`, `const` or `class` binding a closure captures is in its temporal
// dead zone until its declaration runs: reading it, `typeof` it, assigning
// it, `+=` or `++` on it through a closure made before then throws a
// ReferenceError, as a direct reference does; after, it is the value.
function viaArrow(early) { const peek = () => late; if (early) return peek(); const late = "set"; return peek(); }
function viaHoisted(early) { if (early) return peek(); let late = 1; return peek(); function peek() { return late; } }
function viaTypeof(early) { const t = () => typeof late; if (early) return t(); const late = 2; return t(); }
function viaAssign(early) { const put = (v) => { late = v; }; if (early) put(7); let late = 3; put(4); return late; }
function viaCompound(early) { const add = () => { late += 1; }; if (early) add(); let late = 5; add(); return late; }
function viaUpdate(early) { const inc = () => late++; if (early) inc(); let late = 6; inc(); return late; }
function viaClass(early) { const make = () => new K(); if (early) return make().k; class K { constructor() { this.k = "k"; } } return make().k; }
function viaInit(early) { const ch = run(() => (early ? ch : "later")); return ch; }
function run(f) { return f(); }
const cases = [viaArrow, viaHoisted, viaTypeof, viaAssign, viaCompound, viaUpdate, viaClass, viaInit];
function main(i) {
  const f = cases[i % cases.length];
  const early = i >= cases.length || i % 3 === 0;
  try { return [f.name, early, f(early)]; } catch (e) { return [f.name, early, e.name, e.message]; }
}
