// inputs: [0, 1, 7]
// forbid: Map|Set|forEach|next\(
// Map and Set over static keys fold, including iteration order, deletion,
// NaN and -0 keys, and forEach.
function main(n) {
  var m = new Map([["a", 1], ["b", 2]]);
  m.set("c", n);
  m.delete("a");
  m.set(NaN, "nan");
  m.set(-0, "zero");
  var s = new Set([1, 2, 2, 3]);
  s.delete(1);
  var out = [];
  m.forEach(function (v, k) { out.push(k + "=" + v); });
  for (const x of s) out.push(x * n);
  var sum = 0;
  for (const [k, v] of m) if (typeof v === "number") sum += v;
  return [m.size, m.get("c"), m.has("a"), m.get(NaN), m.get(0), s.size, s.has(2), out, [...m.keys()], sum];
}
