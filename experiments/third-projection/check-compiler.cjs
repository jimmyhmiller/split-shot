// The second projection through split-shot: the compiler mix makes of itself
// for an interpreter is made at load, and split-shot specializes the
// flowchart evaluator to it, the interpreted program a runtime value. What
// comes out is the compiler as JavaScript. It must give, for every program,
// exactly the target the compiler gives when the evaluator runs it.
//
//   node check-compiler.cjs [interpreter.js] [dynamic variables, as JSON]
//
// Default: tiny.js, or brainfuck.js with P3=1. The P3 compiler is made by
// running the cogen (mix applied to itself) in the evaluator at load. KEEP=file
// saves the actual compiler split-shot generated. SOURCE_FILE checks an
// assembled playground example through this same pipeline.
// PROGRAMS (JSON) replaces the programs compiled; a
// compiled target is compared by its text (JSON). Needs
// ../../target/release/js-frontend.
const fs = require("fs");
const assert = require("node:assert/strict");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { pathToFileURL } = require("url");

const here = __dirname;
const read = (f) => fs.readFileSync(path.join(here, f), "utf8");
const interpFile = process.argv[2] || (process.env.P3 ? "brainfuck.js" : "tiny.js");
const interp = read(interpFile);
const name = /function\s+(\w+)/.exec(interp)[1];
const dynamic = process.argv[3] ? JSON.parse(process.argv[3]) : (interpFile === "brainfuck.js" ? ["ptr"] : []);

const source = process.env.SOURCE_FILE ? fs.readFileSync(process.env.SOURCE_FILE, "utf8") : [read("../general-jsmix/subset-parse.js"), read("flowchart.js"), read("glue.js"), read("mix.js"), interp, `
const INTERPRETER = toFlowchart(parseProgram(${name}.toString())[0]);
const MIX = toFlowchart(parseProgram(mix.toString())[0]);
const MIX_DIVISION = division(MIX, ["program", "division"], ["n"]);
const DIVISION = division(INTERPRETER, ["program"], ${JSON.stringify(dynamic)});
${process.env.P3
  ? `const COGEN = mix(MIX, MIX_DIVISION, initial(MIX_DIVISION, { program: MIX, division: MIX_DIVISION }));
const COMPILER = deepFreeze(runFlowchart(COGEN, [initial(MIX_DIVISION, { program: INTERPRETER, division: DIVISION })]));`
  : `const COMPILER = deepFreeze(mix(MIX, MIX_DIVISION, initial(MIX_DIVISION, { program: INTERPRETER, division: DIVISION })));`}
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
const out = execFileSync(bin, ["--js", "--source-names", src], { encoding: "utf8", maxBuffer: 1 << 30, timeout: 300_000, stdio: ["ignore", "pipe", "inherit"] });
const seconds = ((Date.now() - t0) / 1000).toFixed(1);
const residual = out.replace(/^--- residual as JavaScript[^\n]*\n/, "").replace(/\n--- [\s\S]*$/, "\n");
const compiled = path.join(dir, "compiler.mjs");
fs.writeFileSync(compiled, residual);

(async () => {
  const fromSplitShot = (await import(pathToFileURL(compiled))).main;
  // The oracle exports are only for Node: they do not change which objects
  // split-shot sees escaping the module under test.
  const oracle = path.join(dir, "oracle.mjs");
  fs.writeFileSync(oracle, source + "\nexport { COMPILER, MIX, MIX_DIVISION, INTERPRETER, DIVISION, initial, mix, runFlowchart, " + name + " };\n");
  const reference = await import(pathToFileURL(oracle));
  const fromEvaluator = reference.main;
  assert.deepEqual(reference.COMPILER, reference.mix(reference.MIX, reference.MIX_DIVISION,
    reference.initial(reference.MIX_DIVISION, { program: reference.INTERPRETER, division: reference.DIVISION })),
    "cogen(interpreter) must equal mix(mix, interpreter)");
  const cases = interpFile === "brainfuck.js" ? require("./brainfuck-cases.cjs") : null;
  const programs = process.env.PROGRAMS
    ? JSON.parse(process.env.PROGRAMS)
    : cases ? cases.map(c => c.program) : ["", "+", "-", "++", "+-", "-+", "--", "+++", "+-+-", "---++", "+".repeat(20), "-+".repeat(9)];
  let same = 0;
  for (const p of programs) {
    const a = JSON.stringify(fromSplitShot(p));
    const b = JSON.stringify(fromEvaluator(p));
    if (a === b) same++;
    else console.log(`DIFFERS on ${JSON.stringify(p)}:\n  split-shot ${a.slice(0, 200)}\n  evaluator  ${b.slice(0, 200)}`);
  }
  let executions = 0;
  if (cases) {
    for (const { program, inputs, output } of cases) {
      const target = fromSplitShot(program);
      assert.deepEqual(target, reference.mix(reference.INTERPRETER, reference.DIVISION,
        reference.initial(reference.DIVISION, { program })), "compiler(program) must equal mix(interpreter, program)");
      for (const input of inputs) {
        const actual = reference.runFlowchart(target, [input]);
        assert.deepEqual(actual, reference[name](program, input), "compiled target must match interpreter");
        if (output) assert.deepEqual(actual, output, "known program output");
        executions++;
      }
    }
  }
  const lines = residual.split("\n").length;
  const left = /evalExpression|"lit" ===|=== "lit"/.test(residual);
  console.log(`${interpFile}: compiler in ${seconds} s, ${lines} lines, evaluator ${left ? "LEFT IN" : "gone"}; ${same}/${programs.length} programs compile identically; ${executions} target executions verified`);
  if (same !== programs.length || left) throw new Error("Compiler identity or evaluator-removal check failed");
  if (process.env.KEEP) fs.copyFileSync(compiled, path.resolve(process.env.KEEP));
  fs.rmSync(dir, { recursive: true });

})().catch(error => { console.error(error); console.error(`Artifacts: ${dir}`); process.exitCode = 1; });
