# Projected N-body residual compiled directly to C

**Result:** yes. The existing C backend accepts the unchanged 9,583-byte
`../residual.js`, emits `generated.c` (136,405 bytes), and clang builds and runs
it without JavaScript fallback. Native outputs exactly match tagged Node
outputs of the original `../input.js` for all eight numeric inputs:
0, 1, 2, 10, 100, 1000, 2500, and 10000.

This is not a dependency-free numeric C kernel. The projected JS has one
function and no interpreter dispatch. The emitted C has one entry function
plus `pe_run` and an empty `pe_dispatch` wrapper (zero dispatch function IDs).
It retains tagged `pe_value` arithmetic/comparisons, arrays, fixed-layout
records, property access/mutation, root frames, safepoints, and GC. Its two
`pe_call_fast` sites invoke Math.sqrt through the native runtime, which maps
that builtin to C sqrt. They are not interpreter/JavaScript execution.

Static call-site counts include 31 `pe_array`, 4 `pe_array_cow`, 5
`pe_record_literal`, 263 `pe_get_fast`, 32 `pe_set_fast`, 370 `pe_safepoint`,
and 2 `pe_call_fast`. These are source occurrences, not dynamic allocations
or executed call counts. Full counts are in results.json.

## Reproduce

Run `python3 run.py` from any directory. The script writes only in this
folder and temporary directories; executable binaries are temporary and
not committed. Every compiler/run process has a 120-second timeout.

The script intentionally uses the existing, **unrebuilt** C frontend at:

```
/Users/jimmyhmiller/Documents/Code/PlayGround/claude-experiments/partial-new/.worktrees/residual-language/claude-experiments/partial-new/target/debug/js-frontend
```

and `runtime/c` in the same experiment directory. The backend worktree is
read-only to this experiment. Its HEAD is
`4ae8f8ca4f8341b5cb8426f5239f8867c1e2d936`, but it has unfinished changes;
**HEAD alone is not a reproducibility pin.** `results.json` records its full
before/after dirty status, SHA-256 hashes of the actual executable, backend
source, inputs, and all runtime files, plus exact executed commands and
compiler versions. All hashed inputs were unchanged across this run.
No runtime snapshot is included here: generated.c requires that matching
runtime ABI, particularly `partial_runtime_internal.h`.

Conceptually the build is:

```
$BACKEND --c ../residual.js > generated.c
clang -std=c11 -O2 -ffp-contract=off -I "$RUNTIME" -I "$RUNTIME/vendor" \
  generated.c "$RUNTIME/partial_runtime.c" "$RUNTIME/number_string.c" \
  "$RUNTIME/vendor/ryu/d2s.c" "$RUNTIME/driver.c" -lm -o /tmp/nbody-native
```

`reference.cjs` is the tagged Node oracle copied from the existing C test
harness. `timed-driver.c` is the C measurement driver copied from its
`tools/c-performance.py`, not a replacement algorithm.

## Additional checks

- AddressSanitizer + UndefinedBehaviorSanitizer, `-O1`,
  `-fno-sanitize-recover=all`: inputs 0, 1, 100, 10000 passed with exact
  outputs and no stderr diagnostics.
- Native C at 10000 steps, three warmups then seven samples: median
  **0.100089 seconds** (99.378–101.096 ms). Each call uses a fresh runtime
  context; timed region is pe_run, excluding context creation/destruction.
  This is an execution measurement, not compilation time or a cross-language
  speedup claim.
- Each timing sample reported 1,403,980 peak runtime bytes, 1,116,592 reserved
  object bytes, 146 minor collections, and zero major collections. These
  confirm that allocation/GC overhead remains despite removal of interpreter
  dispatch.

The checked domain is the eight numeric inputs above, not all possible
JavaScript values or a proof of full semantic equivalence.
