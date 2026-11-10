// @case {"description": "String length, indexing and the string methods of the prelude, including on primitives reached through variables and on values coerced to strings."}
function main(x) {
  var s = "Hello, World", t = "  padded\t\n", n = "" + (x + 100);
  var basics = [s.length, s[0], s[4], s[99] === undefined, s[-1] === undefined, n.length, n[0], "".length, s["length"]];
  var search = [s.indexOf("o"), s.indexOf("o", 5), s.indexOf("zz"), s.lastIndexOf("o"), s.lastIndexOf("o", 5),
    s.includes("World"), s.includes("world"), s.startsWith("Hell"), s.startsWith("World", 7),
    s.endsWith("World"), s.endsWith("Hello", 5), s.indexOf("")];
  var parts = [s.charAt(1), s.charAt(50), s.charCodeAt(0), s.charCodeAt(-1) !== s.charCodeAt(-1), s.at(-1),
    s.slice(7), s.slice(-5, -2), s.slice(3, 1), s.substring(8, 3), s.substring(-3, 2), s.substr(-5, 3),
    s.substr(2), s.concat("!", x, null)];
  var shaped = [t.trim(), t.trimStart().length, t.trimEnd().length, "ab".repeat(3), "x".repeat(0),
    "7".padStart(3, "0"), "7".padEnd(4, "ab"), "long".padStart(2), String.fromCharCode(72, 105, 955),
    String(x) + String(true) + String(null), String()];
  var split = ["a,b,,c".split(","), "abc".split(""), "abc".split(), "a-b-c".split("-", 2), "".split(","), "x".split("x")];
  var compare = ["a" < "b", "abc" === "ab" + "c", "B" < "a", typeof s, typeof s.length];
  return [basics, search, parts, shaped, split, compare];
}
