#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
clang --target=wasm32 -O2 -nostdlib -Wl,--no-entry -Wl,--export=hash -Wl,--strip-all -o hash.wasm hash.c
clang --target=wasm32 -O1 -nostdlib -Wl,--no-entry -Wl,--export=indirect -Wl,--export=memory_sum -Wl,--export=wide -Wl,--export=floating -Wl,--strip-all -o features.wasm features.c
wat2wasm semantics.wat -o semantics.wasm
node embed.mjs
