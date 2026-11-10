// Second projection by self-application: mix(mix, int) = compiler.
const { parseProgram, load, read, mix, JSMIX2_SRC } = require("./harness.js");

const MIX = parseProgram(JSMIX2_SRC);
const file = process.argv[2] || "int.js";
const entry = process.argv[3] || "interp";
const INT = parseProgram(read(file));

const t0 = Date.now();
const compilerSrc = mix(MIX, "mix", [INT, entry]);
console.log(`compiler: ${compilerSrc.length} chars, ${(compilerSrc.match(/^function /gm) || []).length} functions, ${Date.now() - t0} ms`);
require("fs").mkdirSync(require("path").join(__dirname, "out"), { recursive: true });
require("fs").writeFileSync(require("path").join(__dirname, "out", `compiler-${entry}.js`), compilerSrc);
const compile = load(compilerSrc, "main");

const progs = {
  "int.js": [[["addin", 0], ["addlit", 1], ["mullit", 3]], [["addlit", 6], ["mullit", 7]], [], [["subin", 0], ["mullit", 2], ["addin", 0]]],
  "vm.js": [[["jz", 4], ["add"], ["dec"], ["jmp", 0], ["ret"]]],
}[file];
let bad = 0;
for (const p of progs) {
  const viaCompiler = compile([p]);
  const viaMix = mix(INT, entry, [p]);
  const same = viaCompiler === viaMix;
  if (!same) bad++;
  console.log(`${JSON.stringify(p)}: ${same ? "identical to mix(int, prog)" : "DIFFERENT"}`);
  if (!same) console.log("  compiler gave:\n" + viaCompiler + "\n  mix gave:\n" + viaMix);
}
process.exit(bad ? 1 : 0);
