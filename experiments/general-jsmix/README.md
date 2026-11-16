# General AST-based second projection

This derives a prompt/print compiler through a general JavaScript-subset
specializer, rather than running the interpreter against effectMix's fake host.
The original interpreter is unchanged:
`../readable-second-projection/interpreter.js`.

## Reproduce locally

From the repository root:

```sh
npm ci --ignore-scripts --prefix experiments/general-jsmix
npm ci --ignore-scripts --prefix tools/readable-js
cargo build -q --release -p js-frontend --bin js-frontend
node experiments/general-jsmix/derive.cjs
node experiments/general-jsmix/check-codegen.cjs
node experiments/general-jsmix/check-subset-parse.cjs
node experiments/general-jsmix/check.cjs
npm test --prefix tools/readable-js
RUST_MIN_STACK=16777216 cargo test -p js-frontend --lib -- --test-threads=4
```

The raw second projection has **9 blocks and 29 lines**, including its final
newline. It has one instruction loop, no generic AST evaluator or environment
lookup functions, and no program-counter dispatcher. The readability pass only
renames bindings and spells `array["length"]` as `array.length`.

- `generated/prompt-print.input.js`: complete specialization input, including
  jsmix and the annotated interpreter AST.
- `generated/prompt-print.output.txt`: exact split-shot CLI output.
- `generated/prompt-print.compiler.cjs`: raw runnable compiler (`main` renamed
  to `compile`, plus the helper import/export wrapper).
- `generated/prompt-print.readable.cjs`: mechanical readability pass.
- `generated/validation.json`: comparison count, source hashes and diagnostic
  environment for the validation run.

```js
const {compile, run} = require('./generated/prompt-print.readable.cjs');
console.log(compile(['prompt', 'print'])); // generated target source
run(['prompt', 'print'], {
  prompt() { return 'hello'; },
  print(value) { console.log(value); }
});
```

## What is specialized

The split-shot input is one plain program, with no preprocessing: the
interpreter, then `subset-parse.js`, `binding-times.js` and `jsmix.js`, and a
`main` that parses the interpreter's own source and runs jsmix on it:

```js
function main(program) {
  var INT = analyze(parseProgram(interp.toString()), "interp");
  return jsmix(INT, "interp", program);
}
```

split-shot runs the parse and the analysis at specialization time (a call of
`Function.prototype.toString` on a function of known code is its source text),
so neither is left in the compiler. The three files hold only function
declarations: a script with top-level code has globals another script could
replace before `main` runs, and then split-shot rightly keeps the calls through
them. `derive.cjs` builds this program (`plainProgram`) and rejects an
interpreter function named like one of the files' functions.

`subset-parse.js` is a hand-written parser for the subset, in plain JavaScript.
`parse.cjs` lowers Acorn's AST to the same shape; `check-subset-parse.cjs`
checks the two agree (the same AST on every interpreter the checks use, and the
same rejections). `binding-times.js` performs a generic fixed-point, monovariant
binding-time analysis: the entry's first parameter is static to jsmix and the
second dynamic. Calls propagate binding times into declared functions;
assignments and dynamic control promote bindings. Array allocations remain
dynamic to preserve freshness and sharing.

`jsmix.js` interprets that annotated AST. It handles expressions, declarations,
assignments, function calls, if/else, static while loops, completion and throw.
Its source contains no prompt/print instruction rules. `codegen.cjs` implements
generic residual expressions, calls, fresh names, branches and source rendering;
it is not part of the program, so the compiler calls it.

Thus the interpreted program remains unknown to split-shot, including its
length. It is known later, when the derived compiler runs. Dynamic values are
then represented as references to future target-program values. Unlike the
effect-only specializer, this path also handles arithmetic and branches that
depend on prompted input. It is heterogeneous second projection, not Rust
self-application or an assertion that jsmix can specialize itself.

## Why the old result was large

1. Selecting an AST arm into a local before evaluating it merged two known
   syntax lists into an unknown value. The generic evaluator now evaluates the
   selected static arm directly.
2. Replacing whole environments/completion records around loops lost stable
   layout. All JavaScript var bindings are now predeclared, function-scoped
   cells; completion records carry control/results, not replacement frames.
3. Untagged strings confused static strings with generated source. Automatic
   binding-time annotations distinguish static values from residual references.
   A dynamic variable stores a source reference; it is not repeatedly inlined.
4. The generated-statement buffer is an explicit compiler-time helper boundary,
   so its mutable allocation does not cause an initial loop iteration to peel.
5. Edge-copy blocks in the residual CFG could create extra loop entries or a
   nested loop just to copy one variable. A generic bounded renderer pass folds
   small copy-only blocks onto unconditional incoming edges. It preserves copy
   order and effects; conditional predecessors and effectful blocks are excluded.

No diagnostic flags, opcode-specific rewrites, AST-to-compiler table, or
handwritten replacement residual are used for the successful path.

## Supported subset and limits

The entry has two parameters. There are top-level ordinary function declarations,
function-scoped var declarations, assignment to those variables, blocks,
if/else, while with static conditions, return, throw, primitive literals,
arrays, properties/indexing, unary `! - + typeof`, arithmetic/comparison and bitwise `&`
operators, conditional expressions, named calls, and ordinary method calls.
Builtin error constructors with zero or one argument are accepted immediately
inside throw. Static slice supports zero, one and two meaningful arguments.

Dynamic if/conditional expressions are residualized with branch-local effects
and merged variables. Calls preserve receiver/method/argument evaluation order;
getters, coercion sharing, exceptions and array identity are checked. The target
assumes standard pristine builtins, including Reflect.apply.

This is not all JavaScript. let/const/block lexical scope, arbitrary closures,
mutation of static input data, try/catch in interpreted source, dynamic while
loops, non-finite numeric source literals and other unlisted constructs are
rejected or outside the model. Static inputs are immutable primitive/array
values with standard prototypes, not arbitrary objects with getters or methods.
Static heap data is modeled by value; dynamic code must not observe the identity
of those static objects. Dynamic array allocations do preserve identity.
Static work while specializing must terminate, including work in each staged
dynamic branch. Stack traces and source-text reflection are not preserved.

The older default-stack frontend test overflow reproduces at unmodified
fd55448 in `tests::interpreter_return_by_throw_recursion_ends`. All 155 frontend
tests, including four new CFG tests, pass with a 16 MiB test-thread stack.

## Validation

The test script compares the actual derived compilers against direct jsmix
specialization and ordinary interpretation. Cases include all 255 short
prompt/print programs, every I/O failure position, a 500-instruction program,
unknown instructions, another arithmetic interpreter, input-dependent branches,
early returns, deferred throws/errors, conditional expressions, arrays and
identity, hoisting, named functions, getter/argument evaluation order, coercion
sharing, special numeric values, string escaping and static/dynamic promotion.
Raw and readability-processed prompt/print compilers emit identical target text.
See `generated/validation.json` for the final count.

## Member access formatting

Codegen emits dot notation for valid Unicode IdentifierNames, including keyword
property names: `io.prompt()` and `io.default()`. Other keys retain brackets
and proper string escaping. Dynamic keys remain computed, and compound/numeric
receivers keep parentheses where required. This applies consistently to calls,
property expressions and prepared method lookups. `check-codegen.cjs` verifies
syntax selection, receiver precedence and this binding; the main suite retains
getter and argument-order checks.

## Optional separate binding cleanup

After derivation:

```sh
node experiments/general-jsmix/clean-bindings.cjs
node experiments/general-jsmix/check-bindings.cjs
```

This writes `generated/prompt-print.bindings.cjs` without altering the raw or
first readability outputs. Reaching-definition analysis splits reused temporaries
into separate const bindings. Only `remaining` and `value`, the two loop-carried
variables, remain let bindings, each initialized separately. Nine bindings become
const. There are no grouped or uninitialized declarations in this example.

The reusable pass is `tools/readable-js/bindings.cjs`; it has independent loop,
join, capture, TDZ, inferred-name, mutation and directive tests. The example adds
272 compiler equivalence/rejection checks against the prior output.

The same AST-based path now derives the six-command BF compiler under
`experiments/brainfuck-linear/`. Its only generic primitive extension is `&`;
its output-directory option keeps generated artifacts with that example.
