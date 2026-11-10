// Third projection by self-application: mix(mix, mix) = cogen.
const { parseProgram, load, read, mix, JSMIX2_SRC } = require("./harness.js");
const fs = require("fs"), path = require("path");
fs.mkdirSync(path.join(__dirname, "out"), { recursive: true });
const MIX = parseProgram(JSMIX2_SRC);
const t0 = Date.now();
const cogenSrc = mix(MIX, "mix", [MIX, "mix"]);
console.log(`cogen: ${cogenSrc.length} chars, ${(cogenSrc.match(/^function /gm) || []).length} functions, ${Date.now() - t0} ms`);
fs.writeFileSync(path.join(__dirname, "out", "cogen-self.js"), cogenSrc);
const cogen = load(cogenSrc, "main");
for (const [file, entry, progs] of [
  ["int.js", "interp", [[["addin", 0], ["addlit", 1], ["mullit", 3]], [], [["subin", 0], ["mullit", 2]]]],
  ["vm.js", "vm", [[["jz", 4], ["add"], ["dec"], ["jmp", 0], ["ret"]]]],
]) {
  const INT = parseProgram(read(file));
  const compilerSrc = cogen([INT, entry]);
  const direct = mix(MIX, "mix", [INT, entry]);
  console.log(`${file}: cogen(int) ${compilerSrc === direct ? "identical to" : "DIFFERS from"} mix(mix, int)`);
  const compile = load(compilerSrc, "main");
  for (const p of progs) {
    const same = compile([p]) === mix(INT, entry, [p]);
    console.log(`  ${JSON.stringify(p)}: ${same ? "target identical" : "TARGET DIFFERS"}`);
  }
}
