# Real WebAssembly → JavaScript

An original JavaScript interpreter for actual `.wasm` binaries. The playground
runs `hash.c`, compiled by clang, through this interpreter. split-shot knows the
binary but not `input.n`; it removes decoding, operand stacks, instruction
dispatch, and the interpreted function call, leaving a JavaScript hash loop.

[Open the example](https://jimmyhmiller.github.io/split-shot/#/wasm-structured-vm).
The interpreter and embedded binary are together in the editable `main.mjs`.

Run `node experiments/wasm-binary/check.mjs` after building the playground's wasm
package. The check compares our interpreter against native WebAssembly on the
checked-in binaries, then specializes the exact playground program and compares
its generated JavaScript against native execution. It also checks that the
interpreter has disappeared. No third-party interpreter code is used.

To rebuild the binaries and embedded example, run
`bash experiments/wasm-binary/rebuild.sh` with clang's wasm32 target, wasm-ld, and
WABT's `wat2wasm` installed. `hash.c` exercises loops and direct calls;
`features.c` covers memory, indirect calls, i64 and f64; `semantics.wat` covers
branch results, branch tables, numeric boundaries, mutable globals, data,
select, and traps.

The supported subset has function types, locals, globals, one memory and one
function table, active data/element segments, direct/indirect calls, structured
control (including branch tables and single-value results), i32 integer
operations, i64 arithmetic/bit operations, and f64 arithmetic/comparisons.
It rejects unsupported operations explicitly. It requires valid modules; the
binary decoder is not a complete WebAssembly type validator. Imports, start
functions, memory growth, multi-value blocks, f32, SIMD, threads, and the full
numeric conversion instruction set are not implemented.

Binary encoding and execution follow the [WebAssembly specification](https://webassembly.github.io/spec/core/).
