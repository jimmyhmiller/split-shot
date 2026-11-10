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
echo "$out" | grep -q "derived a 15-block compiler" || { echo "P2 block count changed"; exit 1; }
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
# Programs of modules, against Node's loader (reported, not required to pass;
# TypeScript cases need `npm install` in tools/ts-oracle).
node tools/modules.js | tail -1 || true
# Probes that need Prepack's intrinsics (prepack-hard.js format).
node tools/prepack-hard.js prepack-probes --suite probes | tail -1 || true
