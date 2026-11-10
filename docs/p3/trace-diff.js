// Find the first decision where the Rust-compiled cogen diverges from jsmix2.
// An instrumented jsmix2 logs each residualCall decision through `trace`, an
// opaque global the Rust evaluator keeps in order.
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
fs.mkdirSync(path.join(__dirname, "out"), { recursive: true });
const { parseProgram, JSMIX2_SRC, prelude } = require("./harness.js");
const BIN = path.join(__dirname, "../../target/release/js-frontend");
const traced = JSMIX2_SRC.replace(
  "function residualCall(f, args, st, anc) {\n  var k = skels(args);",
  "function residualCall(f, args, st, anc) {\n  var k = skels(args);\n  trace([\"RC\", f[1], str(k), str(anc)]);");
if (traced === JSMIX2_SRC) throw new Error("instrumentation point not found");
const traced2 = process.env.FINE ? traced
  .replace("  var b = evalList(es.slice(1), env, a[1], prog, cx);\n  return [[a[0]].concat(b[0]), b[1]];",
           "  var b = evalList(es.slice(1), env, a[1], prog, cx);\n  trace([\"EL\", es.length, str(a[0]), str(b[0])]);\n  return [[a[0]].concat(b[0]), b[1]];")
  .replace("  var ra = evalList(e[2], env, st, prog, cx);\n  var args = ra[0];",
           "  var ra = evalList(e[2], env, st, prog, cx);\n  var args = ra[0];\n  trace([\"ARGS\", str(callee), args.length, str(args)]);") : traced;
if (process.env.FINE && traced2.split("trace(").length !== traced.split("trace(").length + 2) throw new Error("fine instrumentation points not found");
const MIX = parseProgram(JSMIX2_SRC);
const T = parseProgram(process.argv[2] || "function f(a, x) { return a + x; }");
const input = prelude + "\n" + traced2 + `\nfunction main(input) {\n  var P = ${JSON.stringify(MIX)};\n  return mix(P, "mix", [input[0], input[1]]);\n}\n`;
const tmp = path.join(__dirname, "out", "trace-input.js");
fs.writeFileSync(tmp, input);
const out = execFileSync(BIN, ["--js", tmp], { encoding: "utf8", maxBuffer: 1 << 30, env: { ...process.env, SPEC_WEIGHT_BUDGET: "100000000" } });
const resid = out.split("\n").filter((l) => !l.startsWith("---")).join("\n");
function run(src, fnName, args) {
  const log = [];
  const f = Function("trace", prelude + "\n" + src + "\nreturn " + fnName + ";")((x) => { log.push(JSON.stringify(x)); return x; });
  let r; try { r = f(...args); } catch (e) { r = "THROW " + e.message; }
  return [r, log];
}
const [a, la] = run(traced2, "mix", [MIX, "mix", [T, "f"]]);
const [b, lb] = run(resid, "main", [[T, "f"]]);
console.log("results", a === b ? "identical" : "DIFFER", "| trace lengths", la.length, lb.length);
let i = 0; while (i < la.length && la[i] === lb[i]) i++;
console.log("first trace divergence at", i);
console.log("direct:", (la[i] || "<end>").slice(0, 700));
console.log("rust:  ", (lb[i] || "<end>").slice(0, 700));
