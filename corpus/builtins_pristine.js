// inputs: [0, 2, 5]
// Built-ins are assumed standard unless the program writes them: typeof and
// conversions of built-ins fold, map(String)/map(parseInt) unfold; a program
// that replaces String, or writes the global object with a computed key
// (which could replace Math), gets no folding on them. A constructed regex
// with a "/" in its pattern materializes as an escaped literal.
function main(n) {
  var out = [typeof Math, typeof parseInt, ["1", "2", "3"].map(parseInt).join(","), [n, n > 1].map(String).join("|")];
  if (n > 3) {
    String = function (x) { return "S" + x; };
    var key = n > 4 ? "Math" : "Other";
    globalThis[key] = { max: function () { return "fake"; } };
  }
  out.push(String(7), Math.max(1, n));
  var re = new RegExp("a/b", "g");
  globalThis.keepRe = re;
  out.push(re.source, re.test("xa/b"));
  return out.join(";");
}
