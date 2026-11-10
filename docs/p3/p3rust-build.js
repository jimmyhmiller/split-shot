// Build the input for the Rust evaluator's third projection:
//   main(input) = mix(MIX, "mix", [input[0], input[1]])
// with jsmix2's own AST static and (interpreter AST, entry name) dynamic.
const fs = require("fs"), path = require("path");
fs.mkdirSync(path.join(__dirname, "out"), { recursive: true });
const { parseProgram } = require("./parse2.js");
const src = fs.readFileSync(path.join(__dirname, "jsmix2.js"), "utf8");
const prelude = fs.readFileSync(path.join(__dirname, "prelude.js"), "utf8").replace(/^if \(typeof module.*$/m, "");
const MIX = parseProgram(src);
const out = prelude + "\n" + src +
  `\nfunction main(input) {\n  var MIX = ${JSON.stringify(MIX)};\n  return mix(MIX, "mix", [input[0], input[1]]);\n}\n`;
fs.writeFileSync(path.join(__dirname, "out", "p3rust-input.js"), out);
console.log("wrote out/p3rust-input.js", out.length, "chars");
