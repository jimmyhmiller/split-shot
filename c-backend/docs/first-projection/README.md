# JS into a smaller JS, by interpreting and specializing

This is an executable first Futamura projection experiment, not a new handwritten
JS-to-JS code generator. It lives on `partial-js-projection`, starting from
`69af4d25b`. The generic engine is unchanged. The JS client has one opt-in sharing control,
explained below; its normal behavior is unchanged.

The pipeline is:

1. SWC parses a guest JS file. `js-frontend/src/projection.rs` checks the supported
   syntax and serializes a tagged syntax tree. It annotates local identifiers with
   lexical `(depth, slot)` addresses and records hoisted declarations.
2. `interpreter.js`, an ordinary executable JS interpreter, interprets those data.
   Operators, control flow, calls, closures and completion records are handled
   by this interpreter, not by the encoder.
3. `js-project` constructs `main(input) = interpret(STATIC_AST, input)` and passes
   that source to the existing `js_frontend::to_js_opts` specializer.
4. The residual is executable JS in the target subset. The test runner checks its
   syntax and verifies that interpreter helpers and tagged AST dispatch are gone.

The first projection is precisely `PE(interpreter, static_program)`. Parsing and
binding-name resolution are a front end; they do not emit target instructions or
special-case the fixture computations. `--harness` makes this boundary inspectable.

## Real benchmark: N-body

The exact pinned Hermes / Computer Language Benchmarks Game N-body source and
its existing C-corpus adapter now run end to end through this interpreter. See
[`benchmarks/nbody/`](benchmarks/nbody/README.md) for source hashes, license,
actual residuals, timing methodology and raw results. The original C worktree was
read-only; this is not a rewritten or hand-optimized numerical kernel.

The initial successful residual is 9,583 bytes, one function, no interpreter
helpers or AST dispatch, and two `Math.sqrt` sites. All eight inputs from 0 to
10,000 steps match the original exactly. One local timing round at 10,000 steps
measured 10.28 ms original, 185.35 ms interpreted, 8.26 ms projected, and 10.51 ms
direct existing PE. Independent repeats are recorded with the benchmark. These
are local Node timings, not a general speed claim. The residual is larger than
the 4,823-byte direct-PE result, but eliminates interpretation overhead.

```sh
node docs/first-projection/benchmarks/nbody/run.js
```

The benchmark uses `PE_NO_SHARED_CONTEXTS=1` only for projected compilation, with
a 50-million-node budget and a process timeout. The normal JS client's repeated
branched-context sharing replaces a specialized helper with a generic residual
function, escaping its static syntax arguments. The opt-out disables this
*sharing optimization*, retaining true dynamic-recursion fallback and budgets.
The standard frontend and other benchmark modes keep their default behavior.
Stable syntax IDs in AST data also distinguish numeric variable-address nodes;
they alone did not remove the sharing barrier.

## The residual already goes to C

The exact 9,583-byte N-body residual was also fed unchanged to the existing C
backend in the separate `partial-residual-language` worktree. It emitted
136,405 bytes of C, compiled with clang `-O2 -ffp-contract=off`, and matched the
original exactly on all eight numeric inputs through 10,000. No backend edits,
backend rebuild, or JavaScript fallback were needed. See
[`native-c/`](benchmarks/nbody/native-c/README.md) for commands and raw checks.

This is C with the existing tagged-value, array/record and GC runtime, not yet a
standalone numerical C kernel. The remaining representation work is making
lexical frame arrays and body records into direct C scalars/structs while
preserving the numeric and aliasing contract. The runtime-based C measurement
was about 100.1 ms at 10,000 steps, substantially slower than the projected JS;
C conversion is established, efficient unboxed C is not. ASan/UBSan also passed
on 0, 1, 100 and 10,000 steps.

## Run it

From `c-backend/` in the repository:

```sh
cargo build --release -p js-frontend --bins

target/release/js-project docs/first-projection/fixtures/affine.js > /tmp/lowered.js
target/release/js-project --ast docs/first-projection/fixtures/affine.js
target/release/js-project --harness docs/first-projection/fixtures/affine.js
target/release/js-project --check-target /tmp/lowered.js

node docs/first-projection/test.js
node docs/first-projection/test.js --write-results
```

Compilation writes only JS to stdout and size/timing diagnostics to stderr. The
experiment defaults to `SPEC_WEIGHT_BUDGET=1000000`; an explicit environment
setting overrides it. The normal frontend's budget is unchanged. The runner also
uses process and VM timeouts, so an unsupported experiment cannot run indefinitely.

`results/` contains the actual residuals and a metrics snapshot. Timings there
include CLI process startup and are illustrative, not a benchmark.

## Guest and target profiles

Guest syntax implemented here:

- Function declarations, anonymous functions and arrows, with identifier parameters.
- Function-scoped `var`, including hoisting, captures and mutable closure state.
- Block-scoped `let`/`const`, per-iteration lexical frames, guest constructors
  using `this` for own data fields, `Math.PI`/`Math.sqrt`, and zero/multi-argument
  `Array(...)` construction.
- Calls to guest functions, conditionals, `while`, `for`, `break`, `continue`, return.
- Number/string/boolean/null/undefined values, plain dense arrays, indexing,
  assignments, variable prefix/postfix updates, comma expressions, arithmetic,
  comparisons, bitwise operators and short-circuit `&&`, `||`, `??`.

**This is a typed/data-only experimental subset, not a general JavaScript
compiler. Syntax acceptance does not prove the following value restrictions.**
Inputs and final results must be ordinary data: primitive numbers (including
nonfinite values), booleans, strings, null/undefined, and acyclic dense arrays of data.
Guest function values may be stored, captured, passed and returned *within guest
execution*, and invoked as callees. They must not be inspected as objects, compared,
coerced to primitives, used as property keys, or returned to the host. A closure is
an interpreter data record; `f.length`, `f + ''`, `main === main`, or returning `f`
are outside the contract and can produce different answers. There is no flow/type
checker enforcing this precondition yet. Reads before lexical initialization,
writes to const bindings, full constructor prototype semantics, external getters,
prototype mutation,
custom coercions, symbols and BigInts are also outside this data contract.

Unsupported syntax is rejected, including guest object literals/classes,
arbitrary methods/host calls, `arguments`, `typeof`, exceptions,
async/generators, modules, destructuring, spread, array holes, block-level function
declarations, directives, function-source observation, global-function assignment,
and strings containing unpaired UTF-16 surrogates. Lexical TDZ/const-write errors
and constructor prototypes are not implemented, rather than being validated.
Recoverable SWC syntax errors are rejected too. Top level contains only guest function declarations and must
include `main`. Only the first `main` argument is supplied.

The target profile is intentionally modest rather than maximally minimal:
function declarations, identifier parameters and `var`/`let`; blocks, labels,
`if`, `while`, `break`, `continue`, `return`; primitive operators, literals, arrays, plain records
and property/index access, assignments and direct named calls. No arrows/function
expressions, classes, `for`/`switch`, methods except numeric `Math.sqrt`, spread/destructuring,
exceptions, `new`, `eval`/`Function`, or other host calls. It admits codegen's `let` and
labels. A narrower target can be tried by changing the interpreter and checker.
All successful recorded residuals contain **one function and zero guest/helper
calls**; N-body retains two numeric `Math.sqrt` call sites.

## Actual results

The suite has 10 fixtures plus 40 deterministic generated numeric-domain programs,
780 native/interpreter/residual comparisons, 12 unsupported-source rejection
checks, and negative target-profile tests. Cases include dynamic loops, closures,
short-circuit side effects, hoisting/missing arguments, evaluation order, signed
zero, NaN and infinities. Every successful residual is checked structurally and for
remaining interpreter names or dispatch tags. These tests are useful evidence,
not a proof over every program or value in the contract.

Selected residual sizes, from the included snapshot:

| Case | Via interpreter | Direct existing PE |
| --- | ---: | ---: |
| Affine arrow | 41 B | 41 B |
| Mutable captured counter | 101 B | 53 B |
| Static factorial plus input | 39 B | 39 B |
| Dynamic for-sum | 405 B | 109 B |
| Array loop | 162 B | 60 B |
| Break/continue/early return | 386 B | 740 B |

The affine example becomes:

```js
function main(a) {
  return a * 2 + 3;
}
```

This is promising as a **language-lowering mechanism**, not yet a general size or
speed improvement. The tree dispatch, expression dispatch, and guest closures can
vanish. Runtime environment arrays, identity writes and redundant primitive
expressions remain in some residuals. The direct PE usually emits smaller code;
the control fixture is a useful counterexample, not a broad performance claim.

## What mattered experimentally

1. **A null-reference comparison in a loop guard was enough to spoil staging.**
   The first name-lookup implementation used `while (env !== null)`. The JS
   client's read-only loop-condition probe conservatively treats a heap reference
   in a binary operator as dynamic, even for this identity comparison. It escaped
   the environment and retained about 20 KB of interpreter for the affine case.
   Truthiness traversal removed that barrier without changing the PE.
2. **Separate code from mutable state.** An initial global environment contained
   closures containing the AST, cyclically. Escaping that store escaped the
   program. Globals now resolve against a separately passed static program, and
   lexical addresses replace runtime name lookup. Dynamic for-sum then lowered to
   a single native loop instead of retaining generic interpreter helpers.
3. **Expose the store mutation to loop analysis.** The interpreter's guest loop
   contains the internal identity write `env[1] = env[1]`. Without it, mutations
   hidden behind recursive helpers are not visible to the PE's syntactic
   loop-mutation summary, so static counter fields keep unrolling. The identity
   write lets the runtime store generalize while syntax remains static. This is
   an explicit staging aid and currently survives in loop residuals.
4. **Dynamic recursion is a real remaining limit.** The ordinary interpreter
   computes `factorial(input)`, but specializing it currently exhausts the
   controlled budget. Static factorial specializes successfully. The suite
   reports dynamic recursion as `LIMIT`, not a successful compile or a wrong
   answer. Improving residual calls so they retain static syntax and distinguish
   static contexts is a natural next experiment.

## Next experiments

- Replace the identity-write staging aid with interprocedural mutation summaries
  or an explicit static/dynamic store boundary; scalar-replace surviving frames.
- Specialize recursive residual functions by static AST/callee context rather
  than losing that information at a generic recursive call.
- Add a small guest type/value checker, or faithfully tagged value semantics,
  before expanding the supported source language or advertising broader safety.
- Complete TDZ, const-write errors, constructor prototypes and function-object
  semantics with their own interpreter and differential regressions.

## Regression status

Final required checks passed: 18 engine tests, 141 frontend tests, the unchanged
15-block P2 compiler, six identical P3 targets, 300 fuzz programs with zero
divergences, and corpus 135/135. A separate 300-program fuzz run with the sharing
opt-out also had zero divergences. The new interpreter suite passes 780
comparisons across 10 fixtures and 40 generated programs; the real N-body checks
and timed calls are separate.

The gate's report-only scoreboards are not all green: modules report 14 PASS /
2 WRONG (decorator names and cyclic-ESM TDZ), and Prepack probes 11 PASS / 1 BLOAT.
Both module failures reproduce on a separate clean archive/build of baseline
69af4d25b; none of those existing paths were changed by this experiment.
