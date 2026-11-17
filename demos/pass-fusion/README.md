# Specializing a compiler pass framework

A small numeric-expression compiler using ESTree ASTs, independent visitor
plugins, Acorn parsing, and Astring code generation. Split-shot specializes a
fixed plugin pipeline into a single AST traversal.

```sh
npm ci --ignore-scripts --prefix demos/pass-fusion
node demos/pass-fusion/run.cjs
```

Runs locally on macOS with Rust and Node. No compiler implementation changes.

## Start with the compiler source

[example.js](example.js) contains a numeric kernel:

```js
function score(x, y, enabled) {
  return enabled
    ? ((x ** (1 + 1)) * 1 + (6 * 7)) / 1
    : +(y * 1);
}
```

The runner parses its return expression and runs the **generated optimizer**.
It prints [generated/example.optimized.js](generated/example.optimized.js):

```js
function score(x, y, enabled) {
  return enabled ? x * x + 42 : y;
}
```

## The framework and plugins

[framework.js](framework.js) is an immutable bottom-up AST visitor. Its explicit
work stack handles deep trees without recursive JavaScript calls. It reconstructs
nodes from transformed children, then invokes each registered plugin's `exit`
callback. The visitor knows nothing about the optimization rules.

The independent plugins are:

- [Constant folding](passes/constant-fold.js): evaluate literal arithmetic.
- [Strength reduction](passes/strength-reduce.js): replace `x ** 2` with `x * x`
  when the left operand is an identifier, whose read is pure in this language.
- [Identity removal](passes/remove-identities.js): remove multiplication/division
  by one and unary plus, under the numeric type contract.

[pipeline.js](pipeline.js) is the entire configuration:

```js
function main(ast) {
  return transform(ast, [
    {name: 'constant-fold', exit: constantFold},
    {name: 'strength-reduce', exit: strengthReduce},
    {name: 'remove-identities', exit: removeIdentities}
  ]);
}
```

The runner concatenates these unchanged sources and feeds them to split-shot.
**The plugins are static; the AST, its shape, identifiers, operators, and literal
values are dynamic.** The output is an optimizer for arbitrary trees in this
language, not a precomputed optimization of the example.

See the [complete PE input](generated/pipeline.input.js) and the
[actual unedited residual](generated/pipeline.residual.js). The residual is one
function with one traversal loop: plugin objects, callback calls, pass names,
and the inner pass loop disappear. AST-node and arithmetic-operator dispatch
remain because those inputs are dynamic.

## When this really replaces separate passes

The runner also executes a conventional implementation that invokes the visitor
three times, once per plugin, materializing an AST between passes. It compares
that result with the composed visitor and the specialized optimizer.

These particular passes admit bottom-up composition. Constant folding is first;
the later rewrites do not turn a nonconstant subtree into a constant subtree.
They therefore do not expose additional constant-folding opportunities to a
parent when interleaved. The strength reduction duplicates only an identifier
read. No pass has cross-node analysis state or reorders evaluation.

The framework expresses traversal fusion explicitly; PE removes the plugin
machinery. Arbitrary global compiler passes cannot simply be interleaved this
way. Analyses, control-flow rewrites, and passes requiring whole-program results
need phase boundaries or a different composition contract.

## Language and numeric correctness

This is the expression-optimization phase of a numeric compiler, not a general
JavaScript optimizer. Supported ESTree nodes are numeric `Literal`, local
`Identifier`, arithmetic `BinaryExpression` (`+ - * / **`), unary `+ -`, and
`ConditionalExpression`. All parameters have Number type and local reads are
pure. The example wrapper is preserved; the AST visitor optimizes its return
expression. Calls, member access, mutation, strings, BigInt, getters and arbitrary
JavaScript statements are outside the language. The runner validates parsed
input against this contract before passing it to the optimizer.

Number semantics include NaN, infinities and signed zero. Unsound shortcuts such
as `x + 0 → x` or `x * 0 → 0` are excluded. [print.cjs](print.cjs) correctly emits
negative and nonfinite folded literals, including `-0`, without relying on global
`NaN` or `Infinity` bindings.

## Validation and PE settings

`run.cjs` builds the current local release frontend, using
`PE_NO_SHARED_CONTEXTS=1`, `PE_CONTEXT_POINTS=1`, and a 2M-node budget. It retains
[diagnostics](generated/pipeline.stderr.txt) and [results](generated/results.json).

The current run checks 2,106 ASTs against separate passes, 27,378 executions
against an independent AST interpreter, and 27,391 executions of printed
JavaScript. It checks input immutability, repeated calls in reverse order,
1,000 deterministic generated trees, numerical edge cases, and a 20,001-node
deep AST. Structural assertions require one residual function, one traversal
loop, and no plugin dispatch. No performance claim is made.

A direct recursive visitor did not specialize its plugin parameter away. Its
[reproduction](probes/recursive-ast.input.js),
[residual](probes/recursive-ast.residual.js), and diagnostics are retained, and
the missed specialization is recorded in `split-shot-bugs`. The iterative visitor
is a normal stack-based implementation, with no fixed AST depth or unrolling of
dynamic input.
