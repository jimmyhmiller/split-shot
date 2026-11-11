// inputs: [{"x":1}, {"x":"q"}]
// forbid-main: \.replace
// `replace`/`replaceAll` of a string pattern with a replacement holding `$` patterns: GetSubstitution with no captures (`$$`, `$&`, `` $` ``, `$'`; `$1`, `$<` and a lone `$` stay as they are). marked builds its regexes from texts like `(?:\n+|$)` this way.
function main(i) {
  var r = [];
  var cases = [["x punct y", "punct", "$&!"], ["abcabc", "b", "[$`|$']"], ["a$b", "$", "$$"], ["aXb", "X", "$1$<n>$"], ["aXbX", "X", "($&)"], ["", "", "$&-"], ["ab", "", "<$'>"], ["héllo", "l", "$`"]];
  for (var k = 0; k < cases.length; k++) { var c = cases[k]; r.push(c[0].replace(c[1], c[2]), c[0].replaceAll(c[1] || "zz", c[2])); }
  return [r, i.x];
}
