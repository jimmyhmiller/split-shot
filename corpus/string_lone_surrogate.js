// inputs: ["x", "", "\ude00"]
// A string that is not well-formed Unicode (a surrogate without its pair) is the string it is, not a replacement character: its code units, its length, whether it is well formed, what joins two halves, in a template too.
function main(input) {
  var x = "hello world";
  var lone = "\ud800";
  return [(x + "\ud800").charCodeAt(11), "\ud83d" + "\ude00" === "\u{1F600}", (x + lone).isWellFormed(), JSON.stringify(x + "\ud800"),
          `a\udc00${input}b`.length, lone.length, typeof lone, ("\ud83d" + input).length, ("\ud83d" + input).isWellFormed(), "q\"\\\ud800\n".length,
          "😀".length, "oké".length];
}
