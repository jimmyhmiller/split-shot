// First projection with jsmix2: mix(int, prog) = target.
const { parseProgram, load, read, mix } = require("./harness.js");

function check(file, entry, sval, xs) {
  const src = read(file);
  const target = mix(parseProgram(src), entry, [sval]);
  const run = load(target, "main");
  const ref = load(src, entry);
  let bad = 0;
  for (const x of xs) if (run(x) !== ref(sval, x)) { bad++; console.log("  MISMATCH", file, x, run(x), ref(sval, x)); }
  console.log(`--- ${file} ---\n${target}${bad ? "FAIL" : "ok"} (${xs.length} inputs)\n`);
  return bad;
}

let bad = 0;
bad += check("int.js", "interp", [["addin", 0], ["addlit", 1], ["mullit", 3]], [-3, 0, 1, 5, 10]);
bad += check("vm.js", "vm", [["jz", 4], ["add"], ["dec"], ["jmp", 0], ["ret"]], [0, 1, 2, 5, 10]);
process.exit(bad ? 1 : 0);
