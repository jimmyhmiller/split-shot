# Third projection on Brainfuck

This example self-applies an offline JavaScript specializer, runs the resulting
compiler generator on a Brainfuck interpreter, and uses split-shot to turn that
compiler into JavaScript. All three stages run inside the source supplied to
split-shot. No compiler or cogen is precomputed by Node, and no generated source
is executed with `eval` or `Function` during specialization.

```js
const COGEN = mix(MIX, MIX_DIVISION,
  initial(MIX_DIVISION, { program: MIX, division: MIX_DIVISION }));
const COMPILER = deepFreeze(runFlowchart(COGEN,
  [initial(MIX_DIVISION, { program: INTERPRETER, division: DIVISION })]));
export function main(program) {
  return runFlowchart(COMPILER, [setAt(ENTRY, PROGRAM, program)]);
}
```

`main`'s Brainfuck source is dynamic. Its residual is a JavaScript compiler:
give it source and it returns a target flowchart. The evaluator is gone from
the compiler. The current residual still keeps its variables in a runtime Map;
removing that store is a separate readability limitation. Targets use the
flowchart representation described in
`flowchart.js`; `runFlowchart(target, [inputBytes])` executes them.

## Reproduce

From the repository root:

```sh
cargo build --release -p js-frontend
node experiments/third-projection/check-flowchart.cjs
P3=1 KEEP=/tmp/brainfuck.compiler.mjs node experiments/third-projection/check-compiler.cjs
```

The P3 check defaults to full Brainfuck, with `ptr` dynamic. It checks:

- `cogen(interpreter)` equals the compiler from `mix(mix, interpreter)`.
- The emitted JavaScript compiler produces the same targets as the evaluator.
- `compiler(program)` equals direct specialization, `mix(interpreter, program)`.
- Those targets run like the original interpreter, with independently specified
  outputs for several programs, including Hello World.

`brainfuck-cases.cjs` covers all eight instructions, empty programs, comments,
zero/nonzero loops, nested loops, byte wrapping, and multiple input values.
Compilation has a five-minute timeout; a failure retains the temporary files
for investigation. `KEEP` saves the actual residual on success.

The second-projection check remains available separately:

```sh
node experiments/third-projection/check-compiler.cjs
node experiments/third-projection/check-compiler.cjs brainfuck.js
P3=1 node experiments/third-projection/check-compiler.cjs tiny.js '[]'
```

Without `P3`, the default is tiny. `PROGRAMS` can supply an additional explicit
JSON list of sources to compare. The full Brainfuck execution fixtures always
run when testing `brainfuck.js`.

## Verified result

On the development Mac, the full gate's P3 check completed in 91.5 seconds.
The exact playground source completed natively in 104.5 seconds and in Chrome's
WebAssembly worker in 109.7 seconds. Native and browser output were byte-for-byte
identical: 5,427 lines / 133,246 bytes. A verified copy is in
`generated/brainfuck.compiler.mjs`.

The engine improvement keeps a fully static loop entry in its current
specialization block instead of saving a full heap checkpoint. It follows the
activation's heap references, including Map contents, to check for runtime data.
Mixed activations retain their checkpoint, and the existing static-unroll bound
still applies. This removes the repeated state bookkeeping that blocked the
cogen's load-time execution.

Validation: 20 core and 160 frontend tests, the full gate (294 corpus cases with
and without traced effects, seven scaling checks, zero why-check regressions,
zero wrong/crashing matrix cases, 54 module cases), and all 59 interpreter-suite
cases unchanged in verdict, compiled status, and residual line count. The gate
used committed `docs/p2real` fixtures as described in the handoff, preserving the
separate pending edits. The pre-existing prepack bloat case and interpreter
failures remain unchanged. The playground build and worker lifecycle test pass.

## Implementation

- `mix.js`: a self-applicable offline flowchart specializer, after Jones,
  Gomard and Sestoft. Its worklist contains `(block, static values)` states.
  It executes static assignments/tests and emits dynamic ones. The Trick
  dispatches over the finite set of possible residual block starts.
- `flowchart.js`: JavaScript-subset frontend, evaluator, builtin operations,
  structural state comparison, and binding-time division. Function locals
  are initialized to `undefined`, including assignments in untaken blocks;
  undeclared variable reads still throw. Flowcharts are deeply frozen.
- `brainfuck.js`: the interpreter itself, with bracket scanning and nested
  loops. It uses sixteen byte cells. Programs must use balanced brackets,
  stay inside the tape, and supply every input byte they read.
- `glue.js`: adapters for the specializer's builtin operations.

The worklist index `n` is dynamic when mix specializes itself: otherwise it
would distinguish every worklist length. Brainfuck's pointer `ptr` is dynamic
because a source loop may move it without bound. The interpreter source itself
is static; the source program passed to its generated compiler is dynamic.

In the plain-JavaScript identity check, the cogen has 259 blocks and the
Brainfuck compiler has 155. The older `mix3.js`/`eval3.js` experiment is retained
for comparison; its online self-application produced substantially larger
programs. `check.cjs` tests that older experiment.

## Playground

The **Brainfuck compiler from a cogen** example uses the same parser, specializer,
evaluator, and interpreter. Its `main.mjs` shows the interpreter inline. Helper
files precede it in execution order so their initialization runs first; the UI
opens `main.mjs` initially.

The example opens with a precomputed result: JavaScript, IR, and the complete
why report. Loading it does not start a specialization worker. The saved source
hash and naming setting must match before the result is displayed. Editing the
source or changing settings marks the result out of date and requires the
explicit **Run specialization (~2 min)** button. A visible warning explains the
cost; shared edited versions also remain manual.

Regenerate the snapshot after changing the example, using the browser's actual
WebAssembly API:

```sh
cd playground/web
npm run wasm
npm run precompute
```

The build checks that the saved source matches the example and the saved
JavaScript matches the semantically verified generated compiler. If an engine
change changes the compiler, rerun `npm run check:p3` with `KEEP` pointing to
`experiments/third-projection/generated/brainfuck.compiler.mjs` (an absolute path
or a path relative to `playground/web`) before rebuilding the snapshot.

```sh
cd playground/web
npm run wasm
npm run build
npm run check:p3
```

`check:p3` obtains the exact example through Vite and runs the same semantic
checks on its concatenated source. The main regression gate also checks full
Brainfuck P3, in addition to the existing tiny P2 check.

The store-lifting investigation is preserved under `investigation/` as patches.
It is not part of the engine change: although its focused correctness tests
passed, it made Brainfuck specialization exceed the five-minute check budget.
See the `split-shot-third-projection` pad for the diagnosis.
