# A readable second-projection compiler for prompt/print

The unchanged interpreter in `interpreter.js` has a while loop. Programs are
arrays of any length containing `"prompt"` and `"print"`: prompt reads text,
print displays the current text without changing it, and the initial value is
null. There are no arithmetic instructions.

## Reproduce

From the repository root:

```sh
cargo build -q --release -p js-frontend --bin js-frontend
npm ci --ignore-scripts --prefix tools/readable-js
node experiments/readable-second-projection/derive-effects.cjs
node experiments/readable-second-projection/check.cjs
node experiments/readable-second-projection/check-effects.cjs
npm test --prefix tools/readable-js
node experiments/readable-second-projection/run.cjs '["prompt","print","prompt","print"]'
```

`derive-effects.cjs` writes the complete input, raw CLI output, runnable raw
compiler (`compiler.cjs`), mechanically simplified compiler
(`compiler-readable.cjs`), and transform counts. `readable-names.json` supplies
scope-checked editorial names. The actual raw output is `effects.output.txt`;
it has 12 blocks. No interpreter AST traversal remains.

## What changed

Trying the old AST-based jsmix produced 138 blocks for while, 82 for reduce,
and 592 for recursion. Those compilers still retained evaluator machinery;
merely changing loop syntax did not resolve the specialization gap. Comparison
sources and outputs are retained. An additional AST-staging attempt is under
`investigation/ast-staging/` and still retains generic evaluators.

The successful `effect-mix.js` is a narrower partial evaluator. It executes the
ordinary interpreter with symbolic host methods. Each call emits a binding and
returns a symbolic reference. The only supplied host ABI is a list of method
names. There are no instruction-dispatch/code-generation rules in the
specializer: the interpreter supplies dispatch; generic effect staging supplies
residual calls. Both the interpreter and ABI are fixed when Rust split-shot
specializes effectMix; the instruction array and its length remain dynamic.
This is heterogeneous second projection, not Rust self-application.

Its contract is effect-only staging: interpreter control and program traversal
must depend on the known program, not on host-call results. Dynamic results may
be forwarded to host calls or returned, but not inspected, branched on, or
computed with. Host methods are ordinary functions; supported static host
arguments are JSON primitives. This is not a general JavaScript specializer.
The current prompt/print interpreter meets this contract without modification.

The separate mechanical readability pass has no knowledge of prompt/print or
of the specializer. It removes selected redundant conditional expressions and
jump labels, flattens safe blocks, and alpha-renames bindings. Its preconditions
and semantic contract are documented in `tools/readable-js/README.md`. It does
not hide or replace missing specialization in the older jsmix outputs.

## Validation

255 exhaustive instruction arrays through length seven compare raw/simplified
compiler text, direct effect specialization, interpreter results, ordered I/O
traces, and exceptions at every I/O position. A 500-instruction program,
repeated prints, and a Unicode terminal session are also checked. The older
reduce/recursive compiler outputs are included in runtime comparisons.

A second interpreter uses different opcodes and host methods, plus zero-, one-
and two-argument calls and a static string literal. The same specializer derives
its compiler (14 blocks), and 364 exhaustive programs agree with interpretation.
The readability tool has independent semantic and conservative-rejection tests.

## Explicit helper boundaries

`node experiments/readable-second-projection/derive-helpers.cjs` derives a
7-block variant. `effect-mix-helpers.js` leaves `codegen.emit` and
`codegen.finish` as free calls: their implementation is excluded from the
specialization input, then linked from `codegen-helpers.cjs` in the resulting
CommonJS compiler. This is a normal external module boundary, not a new
noinline annotation. Current split-shot's Prepack-compatible `__residual`
implementation invokes the normal call evaluator; it is not a noinline control.

`emit(lines, method, args)` allocates the next temporary name, converts static
or symbolic arguments to source, emits a call, and returns a symbolic reference.
`finish(lines, value)` renders the generated function. These run at compiler
runtime, not at generated-program runtime. Host prompt/print effects remain in
the generated program.

Raw output: `helpers.output.txt` / `compiler-helpers.cjs`. After the same
mechanical label restructuring and alpha-renaming:
`compiler-helpers-readable.cjs`. Both produce byte-for-byte identical target
source to the fully inlined effectMix on all 255 short programs. Both are also
included in all I/O-trace/exception and 500-instruction checks in `check.cjs`.

## Explicit instruction validation

The interpreter and regenerated compilers now explicitly match `prompt` and
`print`, throwing `Error("Unknown instruction: " + instruction)` otherwise.
Direct interpretation raises this when the bad instruction is reached; staging
raises it during compilation, before any target program is executed. Valid
programs retain exactly their previous generated source and I/O behavior.

The helper variant's current raw output is 9 blocks. The readability pass
handles multiple terminal breaks in a label as an if/else-if/else chain. Tests
include 100 rejection checks across bad instruction types/positions and compiler
variants, plus 97 independent simplifier semantic comparisons.
