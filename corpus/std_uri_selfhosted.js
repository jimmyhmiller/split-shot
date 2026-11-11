// inputs: [0, "a b", "é/?😀", "%41%zz", null]
// forbid-main: (?:encodeURI(?:Component)?|decodeURI(?:Component)?|escape|unescape)\((?!"dyn:" \+ |\{toString)
// The URI functions folded by their self-hosted versions (prelude.js `__pe_std_encodeURIComponent` and the rest): every ASCII character, the reserved and unreserved sets, two-, three- and four-byte UTF-8, the escapes `decodeURI` keeps, hexadecimal digits of both cases, `escape` / `unescape` with `%uXXXX`, incomplete escapes `unescape` leaves alone, arguments that are not strings; and with a runtime string, where the call stays the runtime's (as does the one of an object with a `toString`, which the specializer does not convert). Malformed input (a URIError) stays the runtime's call too: it is not made here, since the program would throw.
function main(input) {
  var out = [];
  var ascii = "";
  for (var i = 0; i < 128; i++) ascii += String.fromCharCode(i);
  out.push(encodeURIComponent(ascii), encodeURI(ascii), escape(ascii));
  out.push(decodeURIComponent(encodeURIComponent(ascii)) === ascii, decodeURI(encodeURI(ascii)) === ascii, unescape(escape(ascii)) === ascii);
  // Every ASCII character as an escape: decodeURI keeps the reserved ones.
  var escapes = "";
  var hex = "0123456789ABCDEF";
  for (var j = 0; j < 128; j++) escapes += "%" + hex.charAt(j >> 4) + hex.charAt(j & 15);
  out.push(decodeURIComponent(escapes) === ascii, decodeURI(escapes), unescape(escapes) === ascii);
  out.push(decodeURI(escapes.toLowerCase()), decodeURIComponent("%c3%a9%C3%a9%e2%82%ac%f0%9f%98%80"));
  var text = "é ñ ü ÿ \u0080 ߿ ࠀ € ￿ ퟿  😀 \u{10000} \u{10ffff} 日本語 a😀b";
  out.push(encodeURIComponent(text), encodeURI(text), escape(text));
  out.push(decodeURIComponent(encodeURIComponent(text)) === text, decodeURI(encodeURI(text)) === text, unescape(escape(text)) === text);
  out.push(encodeURIComponent("https://example.com/a b/?q=1&r=é#frag;x,y+z$@:"), encodeURI("https://example.com/a b/?q=1&r=é#frag;x,y+z$@:[]{}|\\^`<>\""));
  out.push(decodeURIComponent("https%3A%2F%2Fexample.com%2Fa%20b%2F%3Fq%3D1%26r%3D%C3%A9%23frag"), decodeURI("https://example.com/a%20b/%3Fq%3D1%26r%3D%C3%A9%23frag%3B%2C%2B%24%40%3A%2f"));
  out.push(decodeURIComponent(""), decodeURI(""), encodeURIComponent(""), encodeURI(""), escape(""), unescape(""));
  out.push(decodeURIComponent("%C2%80%DF%BF%E0%A0%80%EF%BF%BF%ED%9F%BF%EE%80%80%F0%90%80%80%F4%8F%BF%BF").length, decodeURIComponent("a%25b%2525"), decodeURI("%25%2523%23"));
  out.push(decodeURIComponent("plain 😀 text é without escapes"), decodeURI("😀%F0%9F%98%80😀"), decodeURIComponent("%00%7F").length);
  // Arguments that are not strings (ToString), and none.
  out.push(encodeURIComponent(), encodeURIComponent(undefined), encodeURIComponent(null), encodeURIComponent(12.5), encodeURIComponent(true), encodeURIComponent(-0), encodeURIComponent([1, "a b", [2]]));
  out.push(encodeURI(), decodeURI(), decodeURIComponent(), escape(), unescape(), escape(null), unescape(1e21), decodeURIComponent(25), escape([1, 2]));
  out.push(encodeURIComponent({ toString: function () { return "a b"; }, valueOf: function () { return "no"; } }), encodeURIComponent("a", "ignored"));
  // escape / unescape.
  out.push(escape("@*_+-./ ~!'()#$&=:;,?"), escape("ÿĀ࿿ကꯍ￿"), escape("😀"), escape("\u0000\u0001\u007f\u0080"));
  out.push(unescape("%u0041%u00e9%u20AC%uD83D%uDE00%ud83d%ude00"), unescape("%41%e9%E9%7e%00").length, unescape("%E9") === "é");
  out.push(unescape("%"), unescape("%4"), unescape("%4G"), unescape("%G4"), unescape("%u"), unescape("%u1"), unescape("%u12"), unescape("%u123"), unescape("%u123G"), unescape("%u12345"), unescape("%%41"), unescape("%u%41"), unescape("%uu0041"), unescape("%U0041"), unescape("a%u004"), unescape("a%u0041"), unescape("%u00411"), unescape("%4%41%"), unescape("100%"), unescape("%25u0041"), unescape("%u0025u0041"), unescape("%7"), unescape("%u41zz"));
  out.push(unescape("😀%uD83D%uDE00😀%20"), unescape(escape("😀")) === "😀", escape(unescape("%uD83D%uDE00")));
  // A runtime string: the runtime's own call.
  out.push(encodeURIComponent("dyn:" + input), encodeURI("dyn:" + input), escape("dyn:" + input), unescape("dyn:" + input));
  var enc = encodeURIComponent("dyn:" + input);
  out.push(decodeURIComponent("dyn:" + enc), decodeURI("dyn:" + enc));
  return out;
}
