// Differential check of the Rust evaluator on jsmix2:
//   residual = RustPE(main(input) = mix(P, entry, [input[0]])), P static.
// residual([v]) must equal mix(P, entry, [v]) for each test value v.
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
fs.mkdirSync(path.join(__dirname, "out"), { recursive: true });
const { parseProgram, load, mix, JSMIX2_SRC, prelude } = require("./harness.js");
const BIN = path.join(__dirname, "../../target/release/js-frontend");

function check(name, pSrc, entry, values) {
  const P = parseProgram(pSrc);
  const input = prelude + "\n" + JSMIX2_SRC +
    `\nfunction main(input) {\n  var P = ${JSON.stringify(P)};\n  return mix(P, ${JSON.stringify(entry)}, [input[0]]);\n}\n`;
  const tmp = path.join(__dirname, "out", `rp2-${name}.js`);
  fs.writeFileSync(tmp, input);
  let out;
  try {
    out = execFileSync(BIN, ["--js", tmp], { encoding: "utf8", maxBuffer: 1 << 30, env: { ...process.env, SPEC_WEIGHT_BUDGET: "100000000" }, stdio: ["pipe", "pipe", "pipe"] });
  } catch (e) {
    console.log(`${name}: RUST PE FAILED: ${String(e.stderr).split("\n").find((l) => l.includes("panicked") || l.includes("rror")) || e.message}`);
    return false;
  }
  const resid = out.split("\n").filter((l) => !l.startsWith("---")).join("\n");
  fs.writeFileSync(tmp.replace(".js", ".res.js"), resid);
  const f = Function(prelude + "\n" + resid + "\nreturn main;")();
  let ok = true;
  for (const v of values) {
    let a, b;
    try { a = mix(P, entry, [v]); } catch (e) { a = "THROW " + e.message; }
    try { b = f([v]); } catch (e) { b = "THROW " + e.message; }
    if (a !== b) { ok = false; console.log(`${name} v=${JSON.stringify(v)}: MISMATCH\n  jsmix2: ${JSON.stringify(a).slice(0, 300)}\n  rustpe: ${JSON.stringify(b).slice(0, 300)}`); break; }
  }
  console.log(`${name}: ${ok ? "ok" : "FAIL"} (${(resid.length / 1024).toFixed(0)} KB residual)`);
  return ok;
}

const cases = [
  ["id", "function f(a, x) { return x; }", "f", [1, 2]],
  ["add", "function f(a, x) { return a + x; }", "f", [1, 5]],
  ["cond", "function f(a, x) { return a === 1 ? x : a; }", "f", [1, 2]],
  ["arr", "function f(a, x) { return [a[0], x]; }", "f", [[1], [2, 3]]],
  ["rec", "function f(a, x) { return g(a, x); } function g(a, x) { if (a.length === 0) { return x; } return g(a.slice(1), x + a[0]); }", "f", [[], [1], [1, 2, 3]]],
  ["dynif", "function f(a, x) { if (x === 0) { return a; } return f(a, x - 1); }", "f", [0, 3]],
  ["int", fs.readFileSync(path.join(__dirname, "int.js"), "utf8"), "interp", [[["addin", 0], ["addlit", 1]], [], [["mullit", 2]]]],
];
const only = process.argv[2];
if (only !== "self") for (const [n, src, e, vs] of cases) if (!only || n === only) check(n, src, e, vs);

// Self-application with tiny inner programs: P = jsmix2, entry "mix",
// static arg = the inner program's AST (inner entry and inner svals dynamic
// for jsmix2, so the residual takes [innerProgAst] and returns a function of
// (entry, svals)). Compare by calling with the inner entry and svals fixed.
if (process.argv[2] === "self") {
  const tiny = {
    id: "function f(a, x) { return x; }",
    add: "function f(a, x) { return a + x; }",
    cond: "function f(a, x) { return a === 1 ? x : a; }",
    rec: "function f(a, x) { if (a.length === 0) { return x; } return f(a.slice(1), x + a[0]); }",
  };
  const P = parseProgram(JSMIX2_SRC);
  const input = prelude + "\n" + JSMIX2_SRC +
    `\nfunction main(input) {\n  var P = ${JSON.stringify(P)};\n  return mix(P, "mix", [input[0], input[1]]);\n}\n`;
  const tmp = path.join(__dirname, "out", "rp2-self.js");
  fs.writeFileSync(tmp, input);
  const out = execFileSync(BIN, ["--js", tmp], { encoding: "utf8", maxBuffer: 1 << 30, env: { ...process.env, SPEC_WEIGHT_BUDGET: "100000000" } });
  const resid = out.split("\n").filter((l) => !l.startsWith("---")).join("\n");
  const cogen = Function(prelude + "\n" + resid + "\nreturn main;")();
  for (const [n, src] of Object.entries(tiny)) {
    const T = parseProgram(src);
    const a = mix(P, "mix", [T, "f"]);
    let b; try { b = cogen([T, "f"]); } catch (e) { b = "THROW " + e.message; }
    console.log(`self/${n}: ${a === b ? "ok" : "MISMATCH"}`);
    if (a !== b) { fs.writeFileSync(path.join(__dirname, "out", `self-${n}.direct.js`), a); fs.writeFileSync(path.join(__dirname, "out", `self-${n}.rust.js`), String(b)); }
  }
}
