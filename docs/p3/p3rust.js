// Third projection with the Rust evaluator outside:
//   cogen = RustPE(main(input) = mix(MIX, "mix", [input[0], input[1]]))
// with jsmix2's own AST static. Builds the input, runs the Rust evaluator,
// and checks cogen([int, entry]) against mix(MIX, "mix", [int, entry]).
//   node docs/p3/p3rust.js
const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");
execFileSync("node", [path.join(__dirname, "p3rust-build.js")], { stdio: "inherit" });
const bin = path.join(__dirname, "../../target/release/js-frontend");
const t0 = Date.now();
const out = execFileSync(bin, ["--js", path.join(__dirname, "out", "p3rust-input.js")], {
  encoding: "utf8", maxBuffer: 1 << 30, env: { ...process.env, SPEC_WEIGHT_BUDGET: "100000000" },
});
console.log(`Rust evaluator: ${out.split("\n")[0]} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
const file = path.join(__dirname, "out", "p3rust-cogen.txt");
fs.writeFileSync(file, out);
execFileSync("node", ["--stack-size=65500", path.join(__dirname, "p3rust-check.js"), file], { stdio: "inherit" });
