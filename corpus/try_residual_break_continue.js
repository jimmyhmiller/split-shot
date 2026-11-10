// inputs: [0, 1, 2, 3, 4, 7]
// break and continue out of a try that stays at runtime, inside a loop (used to panic: the nested program re-entered the loop).
function main(x){ var out = []; var items = [1, "a", 2, null, 3, x];
  for (var i = 0; i < items.length; i++) { try { if (items[i] === null) break; if (typeof items[i] === "string") continue; out.push(JSON.parse(String(items[i] * x))); } catch (e) { out.push("e"); } }
  return out; }
