// inputs: ["ab cd", "ab", "", "a1 b22 c", "x y"]
// A read of a property something is known about (a match's `index`, `input`) from a value that may be `null` stays where it stands: under the `?:` or `&&` that guards it, not hoisted above (it threw for a `null` match).
function main(input) {
  var m = /(\w+)\s(\w+)/.exec(input);
  var a = m ? m[1] + "|" + m[2] + "|" + m.index + "|" + m.input.length : "none";
  var n = /(\d)/.exec(input);
  var b = n && n.index + n[1].length;
  var c = n === null ? -1 : n.index;
  return [a, b, c];
}
