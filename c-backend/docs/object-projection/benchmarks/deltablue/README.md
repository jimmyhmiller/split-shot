# DeltaBlue through the object interpreter

Status: **runs correctly, not yet benchmarked properly, and slow.** This directory holds the source and adapter only. There is no `run.py`, oracle file or saved result yet.

- `upstream-deltablue.js` is `benchmarks/octane/deltablue.js` from `facebook/hermes` at commit `04941834ca9fe6d010f086a10e1c0cedad0e13b7`, unchanged.
- `input.js` is lines 420 to 1273 of it (the constraint solver and its two tests) unchanged, preceded by the harness's throwing `alert` and followed by a `main(size)` adapter that runs `chainTest(size)` and `projectionTest(size)` and returns the planner's mark counter after each.

The unmodified solver goes through encoding, per-function specialization, C emission and native compilation. Native results match Node for sizes 1, 2, 10 and 100 (`[103,208]` at 100), and the checked build (proofs verified, collection at every allocation, sanitizers) agrees for sizes 1, 3, 10 and 30.

One informal timing on a loaded machine, best of 9 batches, context creation included for native: 0.571 ms native against 0.048 ms for Node at size 100, and 5.60 ms against 0.66 ms at size 1000. That is 8 to 12 times slower than Node. It is not a measurement under the Richards contract.

Why it is slow, from the encoder's own counts and not from a profile: DeltaBlue builds its class hierarchy with `Object.prototype.inheritsFrom` and initializes fields through `superConstructor.call(this, ...)`. The definite-field analysis only looks at a constructor's own leading assignments, so 14 of 370 named loads are proved own, and no method call has a proved single target. Everything else takes shape lookups and guarded dispatch. Specialization of the 82 functions takes about 56 seconds.

Speed work on this benchmark is deliberately deferred; language coverage comes first.
