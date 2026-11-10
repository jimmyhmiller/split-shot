#!/usr/bin/env bash
# Specialize engine262 (main.mjs) and check the residual against the original.
#   tools/engine262/run.sh [OUT_DIR]
# Needs `npm install` here first. Takes minutes and several GB.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
out="${1:-${TMPDIR:-/tmp}/engine262-run}"
mkdir -p "$out"
cargo build --release -p js-frontend --manifest-path "$root/Cargo.toml" 2>&1 | grep -E "^error" -A5 && exit 1
start=$(date +%s)
(cd "$here" && "$root/target/release/js-frontend" --js main.mjs > "$out/residual.raw" 2> "$out/residual.err")
echo "specialized in $(( $(date +%s) - start )) s"
tail -n +2 "$out/residual.raw" > "$out/residual.js"
echo "original:"; node "$here/time.mjs" "$here/main.mjs" | tee "$out/original.txt"
echo "residual:"; node "$here/time.mjs" "$out/residual.js" | tee "$out/residual.txt"
diff <(awk '{print $1, $2}' "$out/original.txt") <(awk '{print $1, $2}' "$out/residual.txt") && echo "results agree"
