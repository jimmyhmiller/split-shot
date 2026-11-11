// inputs: ["abc", "Straße", "ıΣ", ""]
// forbid-main: \.to(?:Upper|Lower)Case\(\)(?!;)
// String.prototype.toUpperCase and toLowerCase of known strings up to U+00FF, folded by their self-hosted versions (prelude.js `__pe_std_String_prototype_toUpperCase`): every such character, the sharp s that becomes two letters, the micro sign and y-diaeresis whose capitals are above U+00FF, the signs between the letters that do not change; and of a string with a character beyond (and of a runtime string), where the call stays the runtime's (those are statements of their own: the claim exempts a call that ends a statement).
function codes(s) {
  var r = "";
  for (var i = 0; i < s.length; i++) r += s.charCodeAt(i).toString(16) + " ";
  return r;
}
function main(input) {
  var out = [];
  var all = "";
  for (var i = 0; i < 256; i++) all += String.fromCharCode(i);
  out.push(codes(all.toUpperCase()), codes(all.toLowerCase()), all.toUpperCase().length, all.toLowerCase().length);
  out.push("hello world".toUpperCase(), "straße".toUpperCase(), "HELLO World".toLowerCase(), "ÄB×Þ".toLowerCase(), "ä÷þÿµ".toUpperCase(), "".toUpperCase(), "".toLowerCase(), "123 !?".toUpperCase(), "ßß".toUpperCase().length, "ªº".toUpperCase() === "ªº");
  out.push("MiXeD café ÉCOLE".toLowerCase(), "MiXeD café ÉCOLE".toUpperCase(), "a".toUpperCase() === "A", "ÿ".toUpperCase().charCodeAt(0), "µ".toUpperCase().charCodeAt(0));
  // Beyond U+00FF, and a runtime string: the runtime's.
  var b0 = "µ".toUpperCase().toLowerCase();
  out.push(codes(b0));
  var b1 = "ΣΣ İ ǅ 𐐀".toLowerCase();
  var b2 = "σς ı ﬁ ŉ 𐐨".toUpperCase();
  var b3 = input.toUpperCase();
  var b4 = input.toLowerCase();
  out.push(codes(b1), codes(b2), codes(b3), codes(b4));
  return out;
}
