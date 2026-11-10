# C corpus N-body through the JS interpreter

This is the existing `hermes-nbody` C-target benchmark, not a new or simplified
N-body implementation. `upstream.js`, `adapter.js`, and `LICENSE.md` are verbatim
copies from the C PE worktree. `input.js` was produced by importing that worktree's
`tools/c-target.py` and invoking its `prepare(case)` function. `provenance.json`
records hashes, original paths, C-worktree commit, and pinned upstream Hermes
repository/commit. The upstream algorithm function bodies remain unchanged.
The existing adapter selects the number of simulation steps from `main(input)`;
it replaces the upstream fixed-size driver and printing, exactly as in the C suite.

From `c-backend/` in the repository:

```sh
cargo build --release -p js-frontend --bins
node docs/first-projection/benchmarks/nbody/run.js
# Useful while extending the interpreter:
node docs/first-projection/benchmarks/nbody/run.js --native-only
```

The full runner checks native vs ordinary interpreter vs specialized interpreter
on inputs 0, 1, 2, 10, 100, 1000, 2500 and 10000, comparing numeric results with
`Object.is`. The original C correctness corpus uses 0, 1, 10, 1000; its performance
suite uses 10000. Each call constructs a fresh system, as the original adapter does.
The runner writes the actual `interpreter-harness.js`, `residual.js`, compiler
stderr in `projection.log`, and `results.json`. The direct existing JS PE is a
separate contextual baseline, saved as `direct-residual.js`; it is not part of
the first-projection pipeline. No success is claimed unless all three executions
agree and the residual passes the target syntax checker and dispatch checks.

Timing runs use a separate Node process per mode, normal Node globals (not
vm-context global proxies), five warmup calls and seven timing samples. Each
sample adaptively batches 1–100 calls targeting 30 ms, checks every returned
value, and reports per-call times. Compilation and process startup are excluded
from execution times. Both compiler and timing subprocesses are capped at 120
seconds; the benchmark-specific specialization budget defaults to 50 million
(`SPEC_WEIGHT_BUDGET` overrides it). Correctness calls use a 20-second vm timeout. These are short local
microbenchmarks, sensitive to JIT warmup, CPU state, and background activity.
Raw samples and the runtime/CPU are saved. Do not compare an old native-only
snapshot against a later projected run: use the modes from one full results file.

`results.json` records the structural target-checker output, residual size and
hash, literal dispatch tag/helper-name occurrence checks, and Math.sqrt source
occurrences. Source occurrence counts are static, not dynamic execution counts.
The full target checker is the substantive syntax check; regex counts are an
additional check for accidentally surviving interpreter machinery.

The projected compile alone sets `PE_NO_SHARED_CONTEXTS=1`. This disables the
PE's shared-context optimization, which otherwise merges static interpreter
contexts and leaves dispatch in this workload. True recursion detection and
specialization budgets remain enabled. The direct-PE baseline does not set this
flag. The exact projection environment is recorded in `results.json`.

## Recorded result

The full run in `results.json` passes exact equality for all eight inputs in all
four modes. On Node v26.5.0 / Apple M2 Max, 10000-step median times were:

| Mode | Median time | JS bytes |
| --- | ---: | ---: |
| Original C-corpus JS input | 10.281 ms | 4520 |
| Ordinary JS interpreter | 185.354 ms | 24226 |
| Specialized interpreter | 8.256 ms | 9583 |
| Direct existing JS PE | 10.513 ms | 4823 |

The projection took 5.89 seconds and removed interpreter helpers and tagged-AST
dispatch completely. Its residual has one function, no ordinary function calls,
and two static Math.sqrt host-operation sites (the target checker's `calls: 0`
counts ordinary calls, not these permitted intrinsic operations). At 10000 steps,
the residual was 22.45× faster than the ordinary interpreter in this run. It was
also about 19.7% faster than native JS, but this short microbenchmark is not a
claim of a general speed advantage. Raw samples show warmup variation.

The output remains about twice the size of direct PE, with additional temporary
values and control-flow scaffolding. Interpreter removal does not yet imply the
smallest or prettiest residual.

### Independent timing repeats

Two further rounds used fresh Node processes and the saved artifacts, without
recompilation. Mode orders were projected/native/direct PE/interpreter, then
native/projected/interpreter/direct PE. Each process repeated the same five
warmups, seven samples, and exact output check on every call. The initial
measurements remain intact; `independentTimingRounds` contains all repeat samples.

Across all three rounds, the ranges of per-round medians at 10000 steps were:

| Mode | Median range |
| --- | ---: |
| Original JS | 10.281–12.452 ms |
| Ordinary interpreter | 183.931–187.915 ms |
| Projected interpreter | 8.256–8.274 ms |
| Direct existing PE | 10.489–10.623 ms |

Paired within each round, projection was 22.36–22.45× faster than interpretation
and used 19.69–33.56% less time than original JS. This supports the local timing
benefit despite changing execution order; it remains one machine/runtime and a
short microbenchmark, not a general optimization guarantee. The residual is
9,583 bytes versus 4,823 bytes for direct PE (1.99×), with one function and zero
interpreter dispatch. The projection's opt-in sharing change is required to
obtain that residual, rather than merely improve its timing.

These final measurements follow the loop-initializer lexical-frame correction.
The native median in the first repeat was noisier/slower (12.452 ms versus
10.281 and 10.447 ms in the other rounds), so the upper native speedup estimate
should not be overinterpreted. Projected medians stayed within 8.256–8.274 ms.
All saved harness/residual artifacts were regenerated from the final interpreter.
