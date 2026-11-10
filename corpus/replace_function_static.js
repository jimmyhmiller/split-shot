// inputs: ["hi", 5]
// forbid-main: "article"\.replace|unescapeCSS\("
// String.prototype.replace with a RegExp and a function replacement on a static string folds through the prelude's @@replace: each exec folds, each call of the function runs inline (css-select's unescapeCSS on selector names; was a runtime call that made every parsed name a runtime string).
const runescape = /\\([\da-f]{1,6}\s?|(\s)|.)/gi;
function funescape(_, escaped, escapedWhitespace) {
  const high = parseInt(escaped, 16) - 0x10000;
  return high !== high || escapedWhitespace ? escaped : high < 0 ? String.fromCharCode(high + 0x10000) : String.fromCharCode((high >> 10) | 0xd800, (high & 0x3ff) | 0xdc00);
}
function unescapeCSS(s) { return s.replace(runescape, funescape); }
function main(input) {
  const seen = [];
  const a = "article".replace(runescape, funescape);
  const b = unescapeCSS("a\\62 c\\ d");
  const c = "x-y-z".replace(/-/g, (m, p, s) => { seen.push(p); return "_" + p; });
  const d = "aaa".replace(/a/, (m) => m.toUpperCase());
  const e = "ab".replace(/(?<first>a)|b/g, function () { return JSON.stringify(Array.from(arguments).slice(1)); });
  const f = "xx".replace(/(?:)/g, () => "-");
  const g = input.replace ? input.replace(/./g, (m) => m + m) : null;
  return [a, b, c, d, e, f, seen, g];
}
