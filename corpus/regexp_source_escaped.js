// inputs: [0, 1]
// A RegExp's `source` is its pattern as a literal's body
// (EscapeRegExpPattern): a `/` outside a class and a line terminator are
// escaped, an empty pattern is `(?:)`.
function main(n) {
  const r = [new RegExp("a/b"), new RegExp("[/]"), new RegExp("x\ny"), new RegExp(""), new RegExp("a\\/b")];
  return r.map((x) => x.source).join(" ") + n;
}
