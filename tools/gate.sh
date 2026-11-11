#!/usr/bin/env bash
# Regression gate for partial-new: unit tests, the Futamura projections, a
# short fuzz run, and the corpus and module-program scoreboards (reported, not
# required to pass).
set -euo pipefail
cd "$(dirname "$0")/.."
cargo build --release -p js-frontend 2>&1 | grep -E "^error" -A5 && exit 1
cargo test --release -p partial 2>&1 | grep -E "test result: .* [1-9][0-9]* passed|FAILED|panicked" | head -3
cargo test --release -p js-frontend 2>&1 | grep -E "test result: .* [1-9][0-9]* passed|FAILED|panicked" | head -3
out=$(node docs/p2real/derive.js docs/p2real/int.js -o "${TMPDIR:-/tmp}/gate_dc.js" 2>&1)
echo "P2: $out"
echo "$out" | grep -q "derived a 14-block compiler" || { echo "P2 block count changed"; exit 1; }
# The derived compiler must compile programs that compute what the interpreter does.
for case in '[["addin",0]]|5|5' '[["addlit",1],["mullit",3]]|5|3' '[["subin",0],["mullit",2]]|5|-10' '[]|5|0' '[["addin",0],["addlit",1],["mullit",3],["subin",0]]|5|13' '[["addin",0],["addlit",1],["mullit",3],["subin",0]]|-3|-3'; do
  IFS='|' read -r prog x want <<< "$case"
  got=$(node "${TMPDIR:-/tmp}/gate_dc.js" "$prog" "$x" | tail -1)
  [ "$got" = "run($x) = $want" ] || { echo "P2 compiler: $prog on $x gave '$got', want run($x) = $want"; exit 1; }
done
echo "P2 compiler: compiled programs run correctly"
node docs/p3/p3rust.js | grep -c identical | sed 's/^/P3 via Rust: targets identical: /'
node docs/p3/rust-p2-check.js | tr '\n' ' '; echo
cargo run -q -p js-frontend --release --bin fuzz -- --seed 7 --count 300 --batch 150 --no-shrink 2>&1 | tail -2
node tools/corpus.js | tail -1 || true
# The corpus again with each object input behind a recording proxy: what the
# residual does to its input, in order, is what the original does (a read
# made twice, late or not at all differs). See tools/corpus.js `--trace`.
node tools/corpus.js --trace --no-repeat | tail -1 | sed 's/^/TRACE /'
# Specialization cost grows in line with the program (tools/scale.js).
node tools/scale.js | tail -1
# What the corpus residuals hold and for what cause, against the recorded
# baseline: no program may hold more merged or gap work than it did (see
# tools/why.js; `--update` records an improvement).
node tools/why.js --check | tail -2
# The reduction matrix: every feature in every binding-time context (see
# tools/matrix.js, docs/REDUCTION-MATRIX.md). A wrong or crashing cell fails
# the gate; cells that are correct but not reduced are the map, reported.
node tools/matrix.js | tail -1
# Programs of modules, against Node's loader (reported, not required to pass;
# TypeScript cases need `npm install` in tools/ts-oracle).
node tools/modules.js | tail -1 || true
# Probes that need Prepack's intrinsics (prepack-hard.js format).
node tools/prepack-hard.js prepack-probes --suite probes | tail -1 || true
