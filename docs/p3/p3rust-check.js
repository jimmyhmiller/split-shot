// Check the cogen the Rust evaluator derived: cogen = RustPE(main(input) =
// mix(MIX, "mix", [input[0], input[1]])). cogen([int, entry]) must equal
// mix(MIX, "mix", [int, entry]), and the compiler it returns must compile.
const fs = require("fs"), path = require("path");
const { parseProgram, load, read, mix, JSMIX2_SRC, prelude } = require("./harness.js");
const file = process.argv[2] || path.join(__dirname, "out", "p3rust-k1.txt");
const out = fs.readFileSync(file, "utf8");
const resid = out.split("\n").filter((l) => !l.startsWith("---")).join("\n");
const t0 = Date.now();
const cogen = Function(prelude + "\n" + resid + "\nreturn main;")();
console.log(`cogen loaded: ${(resid.length / 1e6).toFixed(1)} MB in ${Date.now() - t0} ms`);
const MIX = parseProgram(JSMIX2_SRC);
let bad = 0;
for (const [f, entry, progs] of [
  ["int.js", "interp", [[["addin", 0], ["addlit", 1], ["mullit", 3]], [], [["subin", 0], ["mullit", 2]]]],
  ["vm.js", "vm", [[["jz", 4], ["add"], ["dec"], ["jmp", 0], ["ret"]]]],
]) {
  const INT = parseProgram(read(f));
  const t1 = Date.now();
  const compilerSrc = cogen([INT, entry]);
  const direct = mix(MIX, "mix", [INT, entry]);
  const same = compilerSrc === direct;
  if (!same) bad++;
  console.log(`${f}: cogen(int) ${same ? "identical to" : "DIFFERS from"} mix(mix, int) (${Date.now() - t1} ms)`);
  const compile = load(compilerSrc, "main");
  for (const p of progs) {
    const ok = compile([p]) === mix(INT, entry, [p]);
    if (!ok) bad++;
    console.log(`  ${JSON.stringify(p)}: ${ok ? "target identical" : "TARGET DIFFERS"}`);
  }
}
process.exit(bad ? 1 : 0);
