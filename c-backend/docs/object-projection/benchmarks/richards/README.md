# Richards: object-interpreter first projection

This experiment uses the original JavaScript scheduler, packets, task control
blocks, task constructors, prototype methods, state masks, queues and validation.
The pipeline being tested is:

```
original guest JS + object interpreter
    -> specialize the interpreter with static guest syntax
    -> residual JS using semantic object/value intrinsics
    -> object-to-c
    -> native C and generic runtime helpers
```

The benchmark is not a handwritten C port, and there are no Richards-specific
intrinsics. The direct guest-to-C compiler is a separate comparison, not the
projection route.

## Sources and two distinct adapters

- `upstream-richards.js` is the complete pinned upstream file, including its
  license. `LICENSE.md` reproduces the BSD notice.
- `input.js` is byte-for-byte `tools/c-target.py.prepare()` for the read-only
  backend manifest's `hermes-richards` entry. Input is an outer **repeat count**.
  Every repetition runs the original `COUNT=1000` workload and original
  `[queueCount, holdCount] == [2322, 928]` check. The return value is `true`.
  Tests cover repeat counts 0, 1, 2 and 3.
- `runtime-count.input.js` is a separately labeled adapter. Input sets the
  original `COUNT` used by `IdleTask`, so it changes actual scheduling work.
  `runRichards` returns `[queueCount, holdCount]`, which every timed call consumes.
  The original fixed-size validation remains active at COUNT 1000; other counts
  use independently measured original-source oracles.
- Runtime COUNT accepts integers from 1 through 1,000,000. It rejects zero,
  negatives, fractions, NaN, infinities and out-of-range values with an `Error`.
  The numeric/bitwise guard is in the adapter, not a new runtime intrinsic.
- `prepare.py` obtains the exact source through the existing backend tool,
  performs three narrowly checked runtime-adapter edits, and reverses those
  edits to prove the algorithm body is unchanged. It disables Python bytecode
  writing before importing the read-only tool.
- `provenance.json` records source repository/commit/URL and SHA-256 checksums.

`oracles.js` independently loads the unmodified upstream algorithm body. At
nonstandard COUNT it catches the expected fixed-size validation failure only
**after** scheduling and reads the actual constructed scheduler counters.
It does not replace scheduling with a formula or change expected counters to
make the original check pass. It compares the adapter with these observations.
A separate mutation test changes EXPECTED_QUEUE_COUNT and confirms that the
runtime adapter still throws at COUNT 1000.

Standard counts are 1, 2, 10, 100, 1000, 2500 and 10000. Additional counts
37, 999, 4093 and 12345 are not specialization inputs. Source generation does
not receive these values.

## Reproduce

From the projection worktree root:

```
python3 docs/object-projection/benchmarks/richards/prepare.py
cargo build --release -p c-backend --bin object-project --bin object-to-c
python3 docs/object-projection/benchmarks/richards/run.py
```

Use `--backend PATH` if the existing C backend worktree is elsewhere.
`--baseline-only` runs original Node and the already-built direct C backend.
`--skip-direct` omits that comparison when unavailable. `--skip-timings` runs
correctness without performance samples. `--compile-timeout`, `--timeout`,
`--rounds`, `--samples`, `--warmup` and `--timing-counts` control bounded runs.
No command builds, changes, or writes into the baseline worktree. Native binaries
and baseline translation units are made under `/tmp` and removed afterward.
The generated projected JS/C and interpreter harnesses stay beside this README.

`results.json` is the full-run report. `baseline-results.json` records the last
baseline-only run and may predate it; do not mix medians from separate runs.
`run.py` retains failed and timed-out stages in `results.json`; a missing or
refused stage is not counted as a pass. `all_five_paths_correct` is true only
when original Node, ordinary interpreter, projected JS, native projection C,
and direct C all match for both adapters. An additional original Node fresh-module
comparison must match too. The native projection is additionally
compiled and checked with AddressSanitizer and UndefinedBehaviorSanitizer.
LeakSanitizer is disabled on macOS, where its runtime is unsupported; these
checks do not claim leak-detector coverage.
Invalid-input checks require the intended guest Error, not just a crash or an
unrelated host exception.

## Measurement contract

Each path has three independent process rounds by default. Within each process,
source loading, parsing and compilation occur before timing; one expected-result
call, five consumed warmup calls and one batch-sizing pilot are untimed. Seven
same-process samples follow, each targeting 30 ms with at most 1000 invocations.
Raw samples, batch sizes, consumed checksums, commands, versions, source hashes
and read-only-backend before/after hashes are retained. The summary is the median
of the three per-process sample medians. Do not interpret preliminary timings
collected during compiler development as isolated-machine performance claims.

The timed region includes each guest invocation, result consumption and checking.
Native C includes context creation and full context destruction for **every**
invocation. The object runtime has a precise mark-sweep collector; Richards
allocates too little to trigger it, so what the timing includes is the cost of
maintaining root frames, plus all allocation and cleanup.
Native generated `object_run` and baseline `pe_run` initialize guest globals on
entry; ordinary Node loads source once per process and calls its `main` repeatedly.
The extra `original_node_fresh_module` comparison compiles a factory once outside
timing, then executes the factory and guest main inside every invocation. This
recreates original functions, prototypes and globals without reparsing and more
closely matches fresh native entry initialization. The primary ordinary Node
result remains visible; it is not replaced by the slower initialization variant.
Normal JS allocations and any GC triggered inside a sample are included.

The result is an end-to-end adapted workload measurement, **not an official
Octane score**, nor a schedule-only microbenchmark. Compilation time is excluded
but failures and compile-time limits remain visible.

## Allocation and dispatch audit

`oracles.js` instruments one untimed original COUNT-1000 invocation separately
from performance measurements. It observes 30 explicit guest constructor/array
allocations before `schedule()` and zero during scheduling:

- Scheduler: 1
- Packet: 8
- TaskControlBlock: 6
- IdleTask: 1, WorkerTask: 1, HandlerTask: 2, DeviceTask: 2
- Array: 9

TaskControlBlock.run dispatches 6573 times: Idle 1000, Worker 468, Handler 2328,
Device 2777. These are invocations, not static call-site counts.

This audit excludes source-initialization function/prototype objects,
instrumentation allocations, and the runtime adapter's additional returned-array
literal. It does not claim the implementation runtime allocates only 30 objects.
Native runtime allocation counters, when that path runs, are recorded separately.
See `oracles.json` for the measured audit and all output pairs.

## Recorded generic-frame baseline

Pinned to commit `fa283978ae28b979f17039fd049090dae0d8f0a1`. The complete raw
record is preserved as `generic-baseline-results.json`; the generated artifacts
and original report are available from that commit. Later candidates may update
`results.json` without replacing this baseline.

Run started 2026-11-09T18:31:27Z, v26.5.0 on macOS-27.2-arm64-arm-64bit-Mach-O.

All six paths matched: 90 input/output comparisons across the exact-repeat and
runtime-COUNT adapters. All 15 projected native sanitizer cases passed. All 42
invalid numeric-COUNT checks produced the intended guest Error. The projection
pipeline and the watched read-only backend files were unchanged during the run.

Median milliseconds per complete runtime-COUNT invocation:

| Path | COUNT 1000 | COUNT 10000 |
| --- | ---: | ---: |
| Original Node, module loaded once | 0.0664 | 0.7961 |
| Original Node, fresh module per call | 1.2709 | 11.3757 |
| Ordinary object interpreter in Node | 17.5310 | 157.4539 |
| Projected JS in Node | 11.6766 | 92.6542 |
| Untouched direct-C backend | 2.9230 | 23.6615 |
| Interpreter-projected native C | 2.1107 | 19.7620 |

This establishes a working interpreter-first projection, not a performance win
over the original Node program. At COUNT 1000, native projection is about 8.3×
faster than the ordinary object interpreter and 1.38× faster than the existing
direct-C comparison, but about 31.8× slower than primary, module-once Node and
1.66× slower than fresh-module Node. Fresh-module Node also changes JIT behavior;
it is a useful additional comparison, not a replacement for the primary result.

The native path still uses tagged values, generic slots/prototype lookup, checked
frame buffers and function-identity dispatch. That is a structural explanation
of remaining work, not a measured profiler attribution. No typed-layout or
unboxed-field speedup is claimed.

Final native object counts are 89 at exact repeat 0, then 119/149/179 at repeats
1/2/3: 30 additional guest objects per actual Richards run. Runtime COUNT uses
120 objects and 377 allocation blocks at every tested count, including the
returned result array. Thus allocation does not grow with the dispatch count.

The full raw samples, per-process medians, commands, hashes and sanitizer records
are in `generic-baseline-results.json`. Exact-repeat timings are also recorded
there. `results.json` is the latest complete pipeline run.

## Final local-promotion and guarded-call result

Semantic implementation commit: `bd1dec2ea2a963c4349c851dae1a61d8bf677f2b`.
Full run started 2026-11-09T19:03:52Z. All six paths again matched all 90
comparisons, all 15 native ASan/UBSan cases passed, and all 42 invalid-input
checks produced the intended Error. Pipeline and read-only backend hashes were
unchanged. Raw samples and generated-artifact hashes are in `results.json`.

Median milliseconds per complete runtime-COUNT invocation:

| Path | COUNT 1000 | COUNT 10000 |
| --- | ---: | ---: |
| Original Node, module loaded once | 0.0661 | 0.6547 |
| Original Node, fresh module per call | 1.0053 | 9.5823 |
| Ordinary object interpreter in Node | 15.6703 | 152.8943 |
| Projected JS in Node | 8.1378 | 77.2682 |
| Untouched direct-C backend | 2.3962 | 23.6535 |
| Final interpreter-projected native C | 1.1324 | 11.3083 |

At COUNT 1000 the final native path is about 13.84× faster than the ordinary
interpreter and 2.12× faster than the untouched direct-C backend. It is still
17.13× slower than ordinary, module-once Node and 1.126× slower than fresh-module
Node. The unchanged 120-object/377-block allocation totals show that these
improvements do not come from removing the benchmark workload.

The two sections above are history. The current result follows.

## Earlier result: type proofs, before the collector

Semantic implementation commit: `38946693e`. Full run started 2026-11-09T22:33:25Z on the same machine and toolchain. All six paths matched all 90 comparisons, all 15 native ASan/UBSan cases passed with analysis proofs checked (`-DOC_VERIFY_PROOFS`), and all 42 invalid-input checks produced the intended Error. Pipeline and read-only backend hashes were unchanged during the run. Raw samples are in `results.json`.

Median milliseconds per complete runtime-COUNT invocation:

| Path | COUNT 1000 | COUNT 10000 |
| --- | ---: | ---: |
| Original Node, module loaded once | 0.0638 | 0.6241 |
| Original Node, fresh module per call | 0.9528 | 9.2116 |
| Ordinary object interpreter in Node | 13.8046 | 136.0892 |
| Projected JS in Node | 5.7470 | 54.3985 |
| Untouched direct-C backend | 2.3595 | 23.2025 |
| Interpreter-projected native C | 0.0489 | 0.4722 |

Per-process medians were 0.0491, 0.0489 and 0.0489 ms for native C and 0.0631, 0.0640 and 0.0638 ms for Node at COUNT 1000. The native path is about 1.30x faster than ordinary module-once Node at COUNT 1000 and 1.32x at COUNT 10000, 282x faster than the ordinary interpreter, and 23x faster than the previous native stage (1.1324 ms).

What this does and does not show:

- The native timing still includes context creation, source initialization and context destruction in every invocation; Node's primary figure loads the module once. The comparison is therefore biased against native C. An informal COUNT 1 run, which is almost all setup, took about 0.004 ms.
- Native allocation is 120 objects in 140 arena blocks per invocation at every COUNT (previously 377 system allocations), so the improvement does not come from removing workload.
- The residual program has 51 guest call sites and only two reads of a function's identity, both for the polymorphic `this.task.run(packet)`. The other method calls in the scheduler were proved to have one target and need no lookup. Node guards the same calls with hidden-class checks, so part of the margin is closed-world knowledge that a JIT for open programs cannot assume.
- Projected JS in Node is 117x slower than the native build of the same residual. The residual is written for the C emitter and the reference intrinsics, which box every value and check every proof; it is a correctness path, not a performance path.
- This is one benchmark, three process rounds, one machine. `docs/object-projection/README.md` lists what was changed and what remains general or limited.

`compare-stages.py` and `stage-comparison.json` below predate this result. Their saved C snapshots still build, but the script's "final" stage now reads the current `runtime-count.generated.c`, so rerun it before quoting its ratios.

### Paired native-stage comparison (earlier stages)

`compare-stages.py` separately compiled all three native snapshots with the
same O2/no-FMA flags and an identical copied driver, then ran them in one quiet
measurement window. Stage order rotated across three rounds. Each process used
five consumed warmups and seven timed samples. Context creation, output
consumption/checking and complete context destruction were included identically.

| Native stage | COUNT 1000 (ms) | COUNT 10000 (ms) |
| --- | ---: | ---: |
| Generic interpreter frames | 2.0070 | 19.7010 |
| Noncaptured-frame local promotion | 1.2827 | 12.7010 |
| Local promotion + guarded known calls | 1.1479 | 11.2577 |

These **same-window** results show about 1.75× total native improvement at both
workload sizes. Local promotion supplies about 1.55–1.56×; guarded known calls
add about 1.12–1.13×. These ratios use paired-stage measurements, not timings
copied from the earlier generic-baseline run. All 33 stage oracle checks and 21
invalid-input checks passed; all measured source and driver hashes stayed fixed.

The generic C source is extracted directly from `fa283978ae28b979f17039fd049090dae0d8f0a1`.
The saved flat snapshot is `frame-promotion.generated.c`, SHA-256
`77406298c6fc6367c85265776f9d22b951a6827ae133480094286f54355aeab7`. It matches the source hash in
`frame-promotion-audit.json`. The generated snapshot was not present in the
implementation commit `4e85986fa991412e9b919e4940a68eddf6e75d6c`; the saved C
artifact itself is the reproducible input. The identical flat C artifact is
verified in the later commit `bd1dec2ea2a963c4349c851dae1a61d8bf677f2b`, from
which it can be extracted. The final stage uses `runtime-count.generated.c`.

Reproduce the paired comparison after generating the final candidate:

```
python3 docs/object-projection/benchmarks/richards/compare-stages.py
```

`stage-comparison.json` retains source/driver hashes, compile commands, exact
oracle outputs, allocation counters, rotated run order, raw samples, per-round
ratios and ratios of medians. It is separate from the preserved
`generic-baseline-results.json`.

## Current result: with a precise collector

Full run started 2026-11-10T00:33:21Z on the same machine and toolchain, on the working tree that became the commit introducing the collector. All six paths matched all 90 comparisons, the pipeline and read-only inputs were unchanged during the run, and all 15 native ASan/UBSan cases passed with analysis proofs checked and a collection forced at every allocation (`-DOC_VERIFY_PROOFS -DOC_GC_STRESS`).

Median milliseconds per complete runtime-COUNT invocation:

| Path | COUNT 1000 | COUNT 10000 |
| --- | ---: | ---: |
| Original Node, module loaded once | 0.0658 | 0.6541 |
| Original Node, fresh module per call | 0.9921 | 10.7803 |
| Ordinary object interpreter in Node | 18.2264 | 137.5600 |
| Projected JS in Node | 8.3816 | 55.3087 |
| Untouched direct-C backend | 2.5117 | 23.4705 |
| Interpreter-projected native C | 0.0555 | 0.5057 |

Per-process medians for native C were 0.0683, 0.0555 and 0.0554 ms at COUNT 1000 and 0.5055, 0.5057 and 0.5061 ms at COUNT 10000. For Node they were 0.0660, 0.0658 and 0.0657 ms, and 0.6460, 0.6751 and 0.6541 ms. The first native round at COUNT 1000 is an outlier above Node; the median is not.

The native path is about 1.19x faster than module-once Node at COUNT 1000 and 1.29x at COUNT 10000. Against the previous section's run (0.0489 and 0.4722 ms) the collector's root frames cost roughly 13% and 7%, though the two runs are separate and Node itself measured about 3 to 5% slower in this one, so treat the difference as approximate. Richards performs 120 object allocations per invocation and never triggers a collection; `fixtures/32-collected-garbage.js` is the test that the collector reclaims memory.

## Heap environments, measured on a loaded machine

Lexical environments moved from fixed interpreter buffers to the collected heap. The saved `results.json` is the full run started 2026-11-10T00:47:37Z. All six paths matched, the pipeline and read-only inputs were unchanged, and the sanitizer cases passed with proofs checked and collection at every allocation.

**This run is not an isolated-machine measurement.** Unrelated compiler jobs from other work were saturating the machine throughout (load average 17 to 19). The run before it, on the same tree, showed Node at 0.0869 ms for COUNT 1000 with rounds from 0.0668 to 0.0894. Rerun on a quiet machine before quoting a ratio.

| Path | COUNT 1000 | COUNT 10000 |
| --- | ---: | ---: |
| Original Node, module loaded once | 0.0661 | 0.7405 |
| Original Node, fresh module per call | 1.0017 | 11.1868 |
| Ordinary object interpreter in Node | 14.8852 | 158.5328 |
| Projected JS in Node | 5.3210 | 52.8984 |
| Untouched direct-C backend | 2.7386 | 24.2450 |
| Interpreter-projected native C | 0.0644 | 0.5158 |

Per-process medians: native C 0.0620, 0.0652, 0.0644 ms and Node 0.0661, 0.0678, 0.0657 ms at COUNT 1000; native C 0.5145, 0.5159, 0.5158 ms and Node 0.7405, 0.7508, 0.6565 ms at COUNT 10000. Native C is ahead in every round, but the margin at COUNT 1000 is within what the load could move. The previous section remains the last quiet-machine result.

## Shapes and slot proofs

Objects moved from one slot per program-wide property atom to shapes with inline slots. The saved `results.json` is the full run started 2026-11-10T01:06:40Z. All six paths matched, the pipeline and read-only inputs were unchanged, and the sanitizer cases passed with proofs checked (now including slot positions and own stores) and collection at every allocation.

Unrelated jobs were still running on the machine (load average 10 to 12), but unlike the previous section's run the per-process medians agree closely, so this is the current reference result.

| Path | COUNT 1000 | COUNT 10000 |
| --- | ---: | ---: |
| Original Node, module loaded once | 0.0662 | 0.6514 |
| Original Node, fresh module per call | 0.9964 | 12.2847 |
| Ordinary object interpreter in Node | 16.1437 | 151.4048 |
| Projected JS in Node | 6.2113 | 59.1575 |
| Untouched direct-C backend | 2.4582 | 23.5295 |
| Interpreter-projected native C | 0.0553 | 0.5112 |

Per-process medians: native C 0.0552, 0.0553, 0.0556 ms and Node 0.0664, 0.0661, 0.0662 ms at COUNT 1000; native C 0.5263, 0.5071, 0.5112 ms and Node 0.6514, 0.6506, 0.6518 ms at COUNT 10000. Native C is about 1.20x faster than module-once Node at COUNT 1000 and 1.27x at COUNT 10000.

In Richards at COUNT 1000 the residual executes about 128,000 loads and 40,000 stores at a proved slot, 8,000 stores and no loads that are proved own without one slot, and about 6,600 unproved loads, nearly all the polymorphic `run` lookup. Before the slot analysis followed a branch whose arms assign the same field, 33,000 loads of `state` lacked a slot and the loop was about 20% slower, which is how much the shape-table lookup costs relative to a fixed-offset load here.
