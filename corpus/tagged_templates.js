// inputs: [1, "q", null]
// Tagged templates: the tag called with the site's template object (cooked strings, frozen, with frozen `raw`; `undefined` for an invalid escape) and the values; a member tag is a method call; one template object per site, the same at every evaluation and across calls.
function tag(strings, ...vals) { return strings.join("|") + "#" + vals.join(",") + "#" + strings.raw.join("|") + "#" + strings.length; }
var seen = [];
function ident(strings) { seen.push(strings); return strings; }
var obj = { p: "P", m(s, v) { return this.p + s[0] + v; } };
function main(input) {
  var out = [];
  out.push(tag`a${1}b${input}c`, tag``, tag`\n${2}\\x`, String.raw`a\n${input}\t`, obj.m`x${input}`);
  for (var i = 0; i < 3; i++) ident`same${i}`;
  out.push(seen[seen.length - 1] === seen[seen.length - 2], ident`same${0}` === seen[0], Object.isFrozen(seen[0]), Object.isFrozen(seen[0].raw), Array.isArray(seen[0]), seen[0].raw[0]);
  out.push((function (s) { return s[0] === undefined ? "undef:" + s.raw[0] : s[0]; })`\unicode`);
  out.push(((s, a, b) => a + b + s.length)`${input}${2}`);
  return out;
}
