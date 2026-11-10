# c-backend

Compiling JavaScript to native code by specializing an interpreter for it, then translating what is left to C.

A stage here is three things: a guest-language interpreter written in JavaScript, an encoder that turns a guest program into the static data that interpreter reads, and a translator from the residual program the partial evaluator leaves into C plus a runtime. The partial evaluator is the `partial` and `js-frontend` crates at the repository root; nothing in them is specific to this crate, and this crate changes nothing in them.

| Stage | Source | Write-up |
| --- | --- | --- |
| First projection of a small expression interpreter | `src/projection.rs`, `src/bin/js-project.rs` | `docs/first-projection/README.md` |
| Numeric subset through to C (N-body) | `src/numeric_projection.rs`, `src/numeric_c.rs` | `docs/numeric-projection/README.md` |
| Objects, closures, classes and a collected heap through to C (Richards, DeltaBlue) | `src/object_projection.rs`, `src/object_c.rs`, `src/object_c_runtime.h` | `docs/object-projection/README.md` |

`docs/small-interpreter-patterns/` holds controlled experiments on which interpreter shapes this partial evaluator specializes away.

## Run

From this directory:

```
cargo build --release -p c-backend
cargo test --release -p c-backend
node docs/object-projection/test.js
OBJECT_TO_C=../target/release/object-to-c node docs/object-projection/test-runtime.js
```

`test.js` runs every fixture through Node, the plain interpreter, the specialized JavaScript, optimized native C, and a checked native build that collects at every allocation and verifies analysis proofs; all five must agree. It needs `clang` and `node`.

The object stage sets `PE_NO_SHARED_CONTEXTS=1` and `PE_CONTEXT_POINTS=1` for the partial evaluator. Both are opt-in flags in `src/js.rs` at the repository root.

## Status

The object stage beats warmed-up Node on Richards and runs unmodified DeltaBlue correctly but slowly. Its speed on Richards comes mostly from a whole-program type analysis in the encoder, not from the specializer; ordinary class-based code, which that analysis does not see through, measured about 9x slower than Node. Moving layout knowledge into what the specializer can see is the open direction. `docs/object-projection/README.md` has the design, the measurements and the list of JavaScript that is unsupported or behaves differently.

## Provenance

Imported from the PlayGround repository, branch `partial-js-projection` at `4dc3fe988` (`claude-experiments/partial-new`), where these files lived inside `js-frontend/` and `docs/`. Saved benchmark results and generated artifacts under `docs/` were produced there, against the partial evaluator as of PlayGround `69af4d25b` plus the two flags above; rerun before quoting them. `docs/object-projection/benchmarks/richards/run.py` also expects a separate direct-C baseline checkout named in its `provenance.json`; pass `--skip-direct` without it.
