// inputs: ["abc-12", "abc", "b", "qr", "?"]
// The match facts of exec on a string not known (its length, which groups are always strings), and an if-converted arm whose values read the match only when it exists (split-shot-specialization-gaps #3; the if-conversion hoisted guarded reads before).
function main(input) {
  const out = [];
  const m = /^(\w+)(?:-(\d+))?(x)?$/.exec(input);
  if (m) out.push(m.length, typeof m[1], typeof m[2], typeof m[3], m[1].length > 0);
  const n = /(a)|(b)/.exec(input);
  out.push(n === null ? "none" : [typeof n[1], typeof n[2], n.length]);
  try { const z = /q(r)/.exec(input); out.push(typeof z[1]); } catch (e) { out.push(e.constructor.name); }
  return out;
}
