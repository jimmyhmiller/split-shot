# A numeric interpreter that projects into fast C

This is the second experiment, following the user's actual goal: write the
interpreter in a C-friendly representation, specialize it with an unchanged JS
program, and automatically translate the numeric residual into fast C. The first
experiment is preserved in commit `b7c20b034` and `docs/first-projection/`.

The real C-corpus N-body benchmark now passes this complete pipeline. No physics
kernel was rewritten or manually optimized. The guest's original constructors,
objects, arrays, lexical scopes and calls are interpreted before specialization.

## Result

At 100,000 steps, medians of three independent seven-sample rounds:

| Execution path | Milliseconds |
| --- | ---: |
| Original Node JS | 93.632 |
| Ordinary numeric interpreter | 1955.218 |
| Projected numeric JS | 435.214 |
| Automatically emitted numeric C | **18.491** |
| Existing direct tagged C PE | 118.020 |

The numeric C is 5.06x faster than original Node and 6.38x faster than the direct
C baseline in this local experiment. All five paths agree **bit-for-bit** on nine
inputs through 100,000. ASan/UBSan passes through 100,000 too. This is one
benchmark, not a general-JS performance claim. The JS basic-block trampoline is
not fast; the C pass removes that dispatch rather than preserving it.

See [the benchmark](benchmarks/nbody/README.md) for raw samples, methodology,
source hashes, actual residual JS/C, and a reproducible runner. The direct C
baseline starts with the original guest, not the earlier interpreter residual.

## Run it

From `c-backend/` in the repository:

```sh
cargo build --release -p js-frontend --bins
node docs/numeric-projection/test.js
python3 docs/numeric-projection/benchmarks/nbody/run.py

# The individual automatic stages:
target/release/numeric-project guest.js > residual.js
target/release/numeric-to-c residual.js > generated.c
clang -std=c11 -O2 -ffp-contract=off -DNUMERIC_STANDALONE generated.c -lm -o program
./program 100000
```

Generated C requires only standard C11 and libm. It exposes
`double numeric_main(double input)`; the optional standalone macro adds a CLI.
No `partial_runtime`, JS engine, tagged-value library, or GC is linked.

## Representation, not a new benchmark implementation

1. The existing SWC/lexical parser reads the original JS. `numeric_projection.rs`
   serializes syntax into immutable numeric tables. It resolves declaration
   references and static property names, not benchmark computations.
2. `interpreter.js` is the executable interpreter. Its dynamic values are
   doubles or numeric offsets into three flat buffers: object/array heap,
   lexical frame stack, and control state. Records use static numeric field
   offsets. Calls and lexical blocks save/restore stack cursors.
3. The existing partial evaluator specializes this interpreter with the syntax
   tables static and `input` dynamic. Interpretation, constructors and guest
   call dispatch disappear. Metadata tables and argument vectors are static
   staging data and do not survive in the runtime residual.
4. `numeric_c.rs` accepts only its explicit numeric residual language. It emits
   C doubles, `double *` indexing, libm operations and native branches. It rejects
   unsupported JS constructs rather than embedding a fallback runtime.

Runtime heap/stack values never use JS records, tag bits or callable objects.
The host primitives are `allocF64`, `loadF64`, `storeF64`, `f64Sqrt` and
`failCapacity`. In ordinary JS they use Float64Array reads/writes. In generated C
loads and stores are direct indexed accesses; there are **no memory-helper calls
on the hot path**. Known intrinsic aliases are propagated at compile time, not
represented by native function pointers.

N-body makes exactly three zeroed allocations and three frees per call: 4096,
4096 and 4 doubles, totaling 65,568 payload bytes. No allocation occurs in the hot
simulation loops. Observed heap cursor high-water is 42 doubles, and stack cursor
high-water is 47 for positive inputs, independent of step count. These are
observations for this program, not proof every guest fits the fixed arenas.

The JS code generator sometimes emits a residual basic-block trampoline. The C
pass validates that restricted form and converts constant block transfers into
C labels/gotos. The native output has no runtime program counter or switch. This
is CFG lowering, not an interpreter for the guest program.

## Static table format

- `nodes`: numeric expression/statement records, padded to 17 elements.
- `functions`: numeric `[parameterCount, slotCount, bodyNodeId]` records.
- `lists`: flat node IDs or declaration triples `[depth, slot, initializer]`.
- `constants`: numeric literals and boolean conditions represented numerically.

Function IDs are allocated before body serialization. Calls carry a static
function ID and a runtime lexical-parent depth. Nonempty lexical blocks and for
scopes each contribute a frame. Property names occur only in frontend metadata,
then become fixed numeric offsets. The interpreter sees `fieldCount` for record
allocation. There are no N-body-specific operators or source substitutions.

## Numeric language contract

This is a restricted numeric JS prototype, **not a full JS engine or a completed
whole-program type checker**. The guest must use initialized numeric values,
booleans as conditions, dense arrays and constructor-created own-field records.
Heap pointers are internal values, never observable numbers. Do not mix pointers,
booleans and numbers where their JS types matter. Results are numeric.

The encoder rejects escaping/anonymous functions, dynamic callees, strings/null/
explicit undefined, dynamic string keys, array holes and length writes. Function
declarations are immutable. Constructors may initialize own numeric fields and
cannot explicitly return. No prototype semantics are implemented. Array indices
must be valid integers; fields and locals must be initialized before reads.
No per-iteration closure copies are needed because function values cannot escape.

Missing initialization/returns and void use the numeric sentinel zero. Programs
must not observe a JS undefined value: no-return calls are used for effects and
omitted initializers are assigned before reads. Lexical TDZ and const-write
errors are not modeled. These dynamic preconditions are documented but not all
statically proved. Invalid arena capacity aborts in C; valid tested programs do
not take that path. Recursive guest functions can run in the ordinary interpreter
within capacity, but are not promised to specialize into the one-function C
profile. Numeric operations accepted by the interpreter but unsupported by the C
emitter are refused at the C stage.

The strict C language supports numeric scalars, flat numeric buffers, arithmetic,
comparisons, branches/loops, direct CFG transfers, sqrt and the specified memory
primitives. Buffer/scalar/intrinsic categories are checked across control flow.
Ambiguous values, uninitialized reads, dynamic call targets, unsequenced stores,
and unsupported constructs reject instead of gaining a generic tagged fallback.
Indices must be integral and in bounds. Compile without fast-math and with
floating-point contraction disabled to preserve the tested numeric contract.

## Staging lessons and remaining work

- Captured-buffer writes directly inside the interpreter's guest loop disabled
  the existing PE's read-only loop invariants. Small numeric setters expose a
  representation the existing analysis can handle.
- Different guest syntax positions share the same interpreter source loop.
  `PE_CONTEXT_POINTS=1` keeps entry-skeleton contexts separate so a static code
  index is not widened into runtime data. This is opt-in; default PE behavior
  outside this numeric experiment is unchanged.
- The preexisting shared-context optimization also loses static syntax here, so
  this projector uses the existing experiment's `PE_NO_SHARED_CONTEXTS=1` opt-out.
- Direct mutable-buffer reads exposed an upstream specialization bug: a mass
  temporary was discarded and a later distance value reused. Disabling value
  coalescing did not fix it. Explicit typed load/store operations preserve their
  order during specialization; C then lowers them to ordinary reads/writes.
  This is a workaround for that PE issue, not a claim it has been repaired.
- The resulting source is not minimal: the saved JS is about 99 KB and C about
  163 KB. Numeric layouts deliver the speed; further scalar replacement,
  integer cursor types, smaller arenas and source cleanup are future work.

`numeric-project` defaults the two flags above and
`SPEC_WEIGHT_BUDGET=150000000` only when not explicitly set. Its stdout is only
residual JS; diagnostics go to stderr. The benchmark harness bounds subprocesses
and records exact compilation environments.

The generic suite also checks nine independent fixtures through original JS,
ordinary interpretation, projected JS and compiled C, with 216 exact comparisons.
It covers arithmetic, arrays, nested loops, immutable declaration calls/captures,
constructor allocation and mutation, break/continue and early return. This is
useful evidence beyond the benchmark, not a proof of the entire language.
