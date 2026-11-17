// The second projection through split-shot: the compiler mix makes of itself
// for an interpreter is made at load, and split-shot specializes the
// flowchart evaluator to it, the interpreted program a runtime value. What
// comes out is the compiler as JavaScript. It must give, for every program,
// exactly the target the compiler gives when the evaluator runs it.
//
//   node check-compiler.cjs [interpreter.js] [division-static] [division-dynamic]
//
// Default: tiny.js (program static). Needs ../../target/release/js-frontend.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { pathToFileURL } = require("url");

const here = __dirname;
const read = (f) => fs.readFileSync(path.join(here, f), "utf8");
const interpFile = process.argv[2] || "tiny.js";
const interp = read(interpFile);
const name = /function\s+(\w+)/.exec(interp)[1];
const dynamic = process.argv[3] ? JSON.parse(process.argv[3]) : [];

const source = [read("../general-jsmix/subset-parse.js"), read("flowchart.js"), read("glue.js"), read("mix.js"), interp, `
const INTERPRETER = toFlowchart(parseProgram(${name}.toString())[0]);
const MIX = toFlowchart(parseProgram(mix.toString())[0]);
const MIX_DIVISION = division(MIX, ["program", "division"], ["n"]);
const DIVISION = division(INTERPRETER, ["program"], ${JSON.stringify(dynamic)});
const COMPILER = deepFreeze(mix(MIX, MIX_DIVISION, initial(MIX_DIVISION, { program: INTERPRETER, division: DIVISION })));
const ENTRY = initial(DIVISION, {});
const PROGRAM = DIVISION.indexOf("program");
export function main(program) {
  return runFlowchart(COMPILER, [setAt(ENTRY, PROGRAM, program)]);
}
`].join("\n");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "split-shot-compiler-"));
const src = path.join(dir, "source.mjs");
fs.writeFileSync(src, source);
const bin = path.join(here, "../../target/release/js-frontend");
const t0 = Date.now();
const out = execFileSync(bin, ["--js", "--source-names", src], { encoding: "utf8", maxBuffer: 1 << 30 });
const seconds = ((Date.now() - t0) / 1000).toFixed(1);
const residual = out.replace(/^--- residual as JavaScript[^\n]*\n/, "").replace(/\n--- [\s\S]*$/, "\n");
const compiled = path.join(dir, "compiler.mjs");
fs.writeFileSync(compiled, residual);

(async () => {
  const fromSplitShot = (await import(pathToFileURL(compiled))).main;
  const fromEvaluator = (await import(pathToFileURL(src))).main;
  const programs = ["", "+", "-", "++", "+-", "-+", "--", "+++", "+-+-", "---++", "+".repeat(20), "-+".repeat(9)];
  let same = 0;
  for (const p of programs) {
    const a = JSON.stringify(fromSplitShot(p));
    const b = JSON.stringify(fromEvaluator(p));
    if (a === b) same++;
    else console.log(`DIFFERS on ${JSON.stringify(p)}:\n  split-shot ${a.slice(0, 200)}\n  evaluator  ${b.slice(0, 200)}`);
  }
  const lines = residual.split("\n").length;
  const left = /evalExpression|"lit" ===|=== "lit"/.test(residual);
  console.log(`${interpFile}: compiler in ${seconds} s, ${lines} lines, evaluator ${left ? "LEFT IN" : "gone"}; ${same}/${programs.length} programs compile identically`);
  fs.rmSync(dir, { recursive: true });
  process.exit(same === programs.length && !left ? 0 : 1);
})();
