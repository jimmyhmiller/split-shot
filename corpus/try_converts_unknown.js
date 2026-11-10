// inputs: [0, 2, 5]
// Inside a try, converting a runtime value of unknown type can throw (a
// Symbol, an object whose valueOf throws): the catch must see it (the try
// was folded away as if the conversion could not throw).
function main(n) {
  const vals = [Symbol("s"), { valueOf() { throw new Error("vo" + n); } }, n];
  const out = [];
  for (const v of JSON.parse("[0,1,2]").map((i) => vals[i])) {
    try { out.push(String(100 + v)); } catch (e) { out.push(e instanceof TypeError ? "TypeError" : e.message); }
    try { out.push(String(-v)); } catch (e) { out.push("neg:" + (e instanceof TypeError ? "TypeError" : e.message)); }
    let w = v;
    try { w++; out.push(String(w)); } catch (e) { out.push("inc:" + (e instanceof TypeError ? "TypeError" : e.message)); }
    try { implicitGlobalForTry = 7 * v; out.push("ok"); } catch (e) { out.push("mul:" + (e instanceof TypeError ? "TypeError" : e.message)); }
  }
  return out.join(",");
}
