// inputs: [0, 2]
// forbid-return: JSON|parse
// JSON.parse of a static string folds: engine262 builds its case-folding
// tables as `new Map(JSON.parse("[[65,97],...]").map(... String.fromCodePoint ...))`. Escapes, surrogate
// pairs, numbers, a repeated key (first position, last value), integer-like
// keys first, nesting; a text it rejects throws at runtime.
function main(x) {
  const table = new Map(JSON.parse("[[65,97],[66,98],[67,99]]"));
  const o = JSON.parse('{"b":1,"a":[true,false,null],"2":"two","1":"one","b":3,"s":"q\\"\\\\\\/\\u00e9\\ud83d\\ude00\\n","n":-0.5e2}');
  const folding = new Map(JSON.parse("[[65,97],[128512,128513]]").map(([a, b]) => [String.fromCodePoint(a), String.fromCodePoint(b)]));
  const out = [table.get(65 + x), table.size, folding.get("A"), folding.get("\u{1F600}"), folding.size, Object.keys(o).join(","), o.b, o.a.length, o.a[2], o.s, o.n];
  function attempt() {
    try { return JSON.parse("{bad}"); } catch (e) { return e.name; }
  }
  out.push(attempt());
  return out.join("|");
}
