// Load jsmix2 and the subset's programs into Node, with the builtins.
const fs = require("fs");
const path = require("path");
const { parseProgram } = require("./parse2.js");
const prelude = fs.readFileSync(path.join(__dirname, "prelude.js"), "utf8").replace(/^if \(typeof module.*$/m, "");
const read = (f) => fs.readFileSync(path.join(__dirname, f), "utf8");

// Run subset source and return the named function.
function load(src, name) {
  return Function(prelude + "\n" + src + "\nreturn " + name + ";")();
}
const JSMIX2_SRC = read("jsmix2.js");
const mix = load(JSMIX2_SRC, "mix");

module.exports = { parseProgram, load, read, mix, JSMIX2_SRC, prelude };
