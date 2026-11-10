# Small interpreter patterns, measured with this partial evaluator

This investigation follows the user's change of focus: find interpreter
representations whose complexity actually disappears during specialization,
instead of continuing to tune the Richards runtime.

These are executable interpreters over fixed, small ASTs, not handwritten
residual kernels. Each comparison keeps its guest AST and numeric behavior
fixed while changing the stated implementation choice. Input values remain
dynamic during specialization. No partial-evaluator implementation was changed.

## Reproduce

From `c-backend/` in the repository, with the existing release tools built:

```
cargo build --release -p js-frontend --bin js-frontend --bin numeric-to-c
node docs/small-interpreter-patterns/representation-pattern.js --out docs/small-interpreter-patterns/representation-results
node docs/small-interpreter-patterns/lookup-pattern.js --out docs/small-interpreter-patterns/lookup-results --bench
python3 docs/small-interpreter-patterns/c-boundary-patterns.py
```

Every runner saves its actual interpreter source, residual JS, correctness
results, hashes and profile. Accepted numeric C cases additionally save generated
C and optimized native assembly. `c-boundary-patterns.py` changes only the entry
function's declaration name from `entry` to `main` for the existing numeric C
CLI. It does not lower or rewrite computations.

All comparisons hold these existing options fixed:

- `PE_NO_SHARED_CONTEXTS=1`
- `PE_CONTEXT_POINTS=1`
- `SPEC_WEIGHT_BUDGET=10000`

These are the experiment's profile, not a claim about all default or future PE
configurations. CLI startup is included in recorded compile-process time. No
benchmark or expected answer is passed as a static input.

## 1. Visible linear search can disappear even with a dynamic query

`lookup-pattern.js` executes the same tiny binding-expression AST using either
a three-entry list or a native Map.

- **Static binding name:** both eliminate the lookup container. Map is supported
  by this evaluator; it is not intrinsically opaque or always worse.
- **Runtime binding name:** the linear loop unrolls into direct name comparisons;
  the Map retains construction and `.get`. The list residual is longer text,
  but has less runtime machinery.

The saved Node microbenchmark has 500,000 calls per sample, nine rotated samples:

| Path | Median total |
| --- | ---: |
| Linear interpreter | 18.56 ms |
| Linear residual | 4.39 ms |
| Map interpreter | 96.46 ms |
| Map residual | 85.92 ms |

Queries cycle through three present names and a missing name. Each call constructs
a fresh environment. The Map timings therefore include
retained allocation and do not isolate `Map.get`, a persistent/shared Map, or
large lookup tables. The exact samples and checks are in `lookup-results`.

The numeric-query version in `c-boundary-results` makes the C consequence
visible too. Its guest uses `input % 3` to select among three bindings. The
156-byte linear residual contains only comparisons and numeric returns, and the
existing numeric C target accepts it. The 122-byte Map residual retains `new
Map(...).get(...)`. The shorter text is not the better staged result.

With static names, list, plain object, native Map and a visible bucketed hash
all produce the **same 42-byte JS and identical generated C/native body** for
`input * 2 + 3`. Thus the lesson is static structure and visible operations,
not a blanket ban on maps or hashing.

## 2. A runtime-derived cache key can make a good interpreter worse

The three `cache-*` cases execute one shared AST reading the same binding twice.
The input is numerically coerced before interpretation in every variant.

- No cache: 48 bytes; no runtime lookup container.
- Cache indexed by static variable name: the identical 48-byte residual.
- Cache indexed by name plus runtime context/value: 228 bytes, retaining a Map
  and `has/get/set` logic.

The first two also generate identical C and native bodies. This models adding
runtime context to a memoization key even though the binding layout is static.
The frame is fresh and immutable in this experiment; a real mutable binding
cache must still preserve correct invalidation. It is not a proposal to key real
caches by input value or remove necessary context. Where instance/version
identity is genuinely required, retain it; where syntax/layout identity suffices,
do not unnecessarily make the cache depend on dynamic data.

## 3. Keep interpreter machinery private and state direct

The sum-loop AST in `representation-results` is unchanged across these cases:

| Interpreter choice | Residual JS |
| --- | ---: |
| Private helpers, flat slots | 212 B |
| Public script helpers | 1006 B, helpers and AST remain |
| Plain numeric-property slots | 221 B |
| Wrap slots in `env.values` | 286 B |
| Replace boxed cells on assignment | 334 B |
| Mutate boxed cells | 303 B |

The simple cases remove expression/statement dispatch, but their residual slot
containers are still runtime data. Per-cell boxes preserve extra objects and
indirection; replacing boxes even leaves allocation in the loop.

Public helpers have different visibility obligations: another script could
replace them. Privatizing compiler/interpreter implementation helpers is useful;
this is not permission to change an externally visible API's semantics.

Changing numeric/string node IDs, padding AST rows to 17 entries, or switching
AST tuples to records made **no difference** in this controlled private-helper
example: each produced the identical 212-byte residual. These are not reliable
magic fixes by themselves.

## 4. A simple typed primitive can be enough

In `sum-buffer`, only numeric slot allocation/initialization changes from the
plain-array sum interpreter to `allocF64(3)`. The PE still removes all AST
interpretation. The existing numeric target accepts the 215-byte residual.
Clang `-O2 -ffp-contract=off` then removes the buffer and leaves a register-only
sum loop: no allocation, property lookup or interpreter call. The native body is
saved, not inferred from a source-size metric.

In the `primitive-*` pair, visible `Math.sqrt(4)` folds during PE, while opaque
`f64Sqrt(4)` remains in residual JS (38 versus 47 bytes). Both generate
**identical optimized native bodies**. Expose the facts the PE needs, but do not
assume every low-level numeric primitive must be unfolded inside the interpreter.

A larger/less pretty JS residual is not automatically a worse native program.
Conversely, a short call into a retained dynamic data structure is not proof
that interpretation was eliminated.

## Negative results and current evaluator quirks

- `call-mixed` versus `call-split` separates a static callee AST from mutable
  argument storage. Both retain recursive interpreter helpers, 492 versus 490
  bytes. Separating code/data is not sufficient in every context.
- Linked binding traversal with `while(env)` reduces to a 42-byte numeric
  expression, while equivalent `while(env !== null)` retains a 327-byte lookup
  loop here. This is an evaluator-specific inference limitation, not a general
  semantic/style recommendation.
- Removing the private numeric environment's identity write exhausts the fixed
  specialization budget while the baseline finishes. The write is a staging aid
  for the current loop-mutation analysis, not desirable guest work. A focused PE
  regression/fix is preferable to spreading unexplained identity writes.

C refusal is recorded separately from JS correctness. The strict numeric target
rejects retained maps, ordinary objects and recursive helpers; that does not
prove those features cannot be compiled efficiently by a richer backend. All
accepted C results were checked against an independent numeric oracle, including
signed zero, NaN, infinities where terminating, and fractional loop bounds.

## Practical direction

Start with private, visible interpreter functions and a plainly inspectable
static syntax/binding layout. Use direct numeric state before boxes, cache
layers or generalized frame objects. Test one abstraction at a time with the
same guest AST and dynamic input, and require the residual to demonstrate which
machinery vanished. Keep the failed hypotheses and backend limitations visible.
Only carry a pattern back into a larger interpreter after these checks pass.

These are finite synthetic tests, not full JS conformance or a general speed
claim. No additional Richards optimization is enabled. Its safe implementation
and saved getter-inlining candidate remain in the preceding commits and
`docs/object-projection`.
