// inputs: [0, 2, 5]
// `++`/`--` read the place once and write it once (a getter or setter sees
// one call each; the postfix value is not a second read), evaluate the base
// and key once, and work on a global.
var counterGlobal = 0;
function main(n) {
  const log = [];
  const o = { _v: n, get v() { log.push("get"); return this._v; }, set v(x) { log.push("set " + x); this._v = x; } };
  const a = o.v++;
  const b = ++o.v;
  let calls = 0;
  const base = () => { calls++; return o; };
  base().v--;
  const keys = [];
  const key = () => { keys.push("k"); return "_v"; };
  o[key()] += 0;
  o[key()]++;
  counterGlobal++;
  ++counterGlobal;
  return [a, b, o._v, log.join(","), calls, keys.length, counterGlobal].join("|");
}
