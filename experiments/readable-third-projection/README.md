# Readable compiler emitted by a third projection

The artifact of interest is `generated/compile.js`: the **compiler emitted by the
compiler generator**, not the compiler generator itself.

This experiment uses the repository's annotated lambda-calculus specializer in
`demos/mogensen/engine.js`, rather than claiming the general JS specializer can
self-apply. Its source language has variables, applications, and abstractions.
Programs and residual programs use higher-order abstract syntax (three curried
handlers), not JavaScript source strings.

## As a plain program

`playground/examples/lambda/specializer.js` is the specializer written as
ordinary code: the annotated specializer PA in higher-order abstract syntax
(five constructors; a binder is a JavaScript function of its variable) and the
kernel. There is no quoting step and no generated literal.

- `lambda/cogen.js`: `main(interpreter)` returns
  `evaluate(mix(PA())(PA()))(interpreter)`. split-shot specializes it in about
  0.2 s to a 6.3 KB compiler generator with nothing of the specializer term left
  (the generated literal of `lambda.input.js` gives 30 KB).
- `lambda/all-three.js`: `main(k)` runs all three projections in a row, then the
  program: the cogen, the compiler it makes for the lambda calculus (EA), the
  square of a Church numeral compiled with that, applied to `k` as a numeral and
  read back as a number. Every stage is known, so split-shot runs them all and
  leaves only the compiled program: two nested loops. (Returning the compiled
  term itself, a function, leaves the evaluator in: an escaping closure is
  emitted generically. A first-order interface lets everything fold.)

`node experiments/readable-third-projection/check-plain.cjs` checks both: the
cogen's compilers equal mix(mix, interpreter) for both interpreters, their
targets equal mix(interpreter, program) and compute the right Church numerals;
and the all-three target squares k for k = 0..9 and is byte for byte what the
first and the second projection give for the same program.

## Reproduce

From the repository root, with `target/release/js-frontend` built:

```sh
node experiments/readable-third-projection/probe-lambda.cjs
node experiments/readable-third-projection/derive.cjs
node experiments/readable-third-projection/check.cjs
```

The first command invokes actual split-shot on `lambda.input.js`, whose static
computation is the self-application `mix(P)(P)`. Its dynamic parameter is an
interpreter. The raw residual generator is `lambda.output.txt` (30,872 bytes).
That residual constructs a compiler when given an annotated interpreter.

Independently, `derive.cjs` executes the specializer's own pure lambda source:
`P(quote(P))(quote(P))`. It executes the resulting generator on the annotated
lambda interpreter, then checks the compiler against the one obtained from
split-shot's residual. The raw compiler is a 60-node lambda term.

For readability, the renderer recognizes exact fixed-point and syntax-constructor
encodings, introduces the generic helpers in `helpers.cjs`, and alpha-renames
bindings. Expanding those helpers reconstructs the original derived lambda term
up to alpha equivalence; this is asserted, not just checked on examples. The
constructor helpers retain lazy fields to preserve evaluation points. This
translation assumes pure lambda terms; it does not promise JavaScript function
identity or source-reflection equivalence.

`generated/compile.js` is that compiler rendered as JavaScript using these
helpers. It recursively translates source syntax to residual syntax. It does not
call a partial evaluator. This minimal interpreter's compiler reconstructs the
program; it is not a Brainfuck compiler or an optimizing JavaScript compiler.

## Validation

The check compares generated compilers with direct second projection for both
the ordinary lambda interpreter and an interpreter that applies a program twice.
It compares their targets with direct first projection, checks the readable
compiler on seven programs (including shadowing and capture-sensitive terms),
and runs numeric observations of Church-encoded functions: four compiler
comparisons, 21 target comparisons, and 168 numeric assertions.

## JavaScript experiments that did not produce a readable compiler

`probe-jsmix.cjs` self-applies the existing `docs/p3/jsmix2.js` with a fixed
one-static-argument wrapper. The resulting generator produces a 151,153-byte
compiler for the recursive accumulator interpreter, equal to direct P2 output.
Passing that compiler through split-shot grew it to 2,585,561 bytes / 7,903
blocks. `probe-compiler.cjs` tried smaller interpreters; even their cleaned
compilers retain 111 and 138 blocks. These are size/readability limitations,
not evidence of incorrect execution. The probes and raw outputs are retained
for reproduction. No claim is made that the general JavaScript or Brainfuck
third-projection path is now readable.

## Prompt/print source language

The same generated compiler generator now also accepts an annotated interpreter
for the familiar `prompt` / `print` language. This is a new source-language
interpreter on the same self-applicable kernel, not the JavaScript interpreter
AST from `general-jsmix` passed unchanged to a different specializer.

- `prompt` replaces the current value with the input.
- `print` prints the current value; the initial value is null.
- Programs have any finite number of instructions; invalid instructions are
  rejected during input encoding, before execution.

Run `node experiments/readable-third-projection/prompt-print.cjs` to feed that
interpreter to the actual split-shot residual generator from `lambda.output.txt`.
The emitted compiler is saved as `generated/prompt-print.compiler.lambda` and
`.json`. Its exact constructor/fixed-point encodings are factored into generic
helpers. The readable emitted compiler is `generated/prompt-print.compile.cjs`.
`functionCode` groups consecutive code abstractions, `reference` builds a code
variable, and `bindCode` builds an application of a code abstraction. These are
constructor aliases; none implements specialization or interpreter dispatch.
`matchProgram` expands to application of the three supplied data handlers.

Internally, instruction lists are encoded as functions selecting end/prompt/print
handlers. `prompt-print-program.cjs` only encodes data and checks instruction
names; all translation behavior is in the generated compiler. The generic kernel
still operates on annotated lambda terms, while the user's source language is
just an array of prompt/print strings.

The generated compiler's runtime ABI has curried prompt, print, and initial-value
parameters. `prompt-print-backend.cjs` lowers its target terms to ordinary
JavaScript using `io.prompt()` / `io.print(value)`, null as the initial value,
and constant bindings for applications of abstractions. This is an explicit
backend for this ABI, not a claim that the raw compiler directly emits JS text.
`prompt-print-api.cjs` supplies the public `compile(array)` API.

```js
const {compile} = require('./prompt-print-api.cjs');
console.log(compile(['prompt', 'print', 'print', 'prompt', 'print']));
```

`node experiments/readable-third-projection/check-prompt-print.cjs` verifies 128
programs (every sequence up to six instructions plus an 80-instruction case),
256 structural comparisons between raw compiler, readable compiler, and direct
first projection, plus 1,024 execution comparisons. The latter check original
interpreter, lambda target, and JS target against each other, including returns,
getters, receiver identity, method argument counts, and exceptions. Unknown
instructions have two additional rejection checks.
