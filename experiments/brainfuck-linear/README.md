# A real compiler for a straight-line Brainfuck subset

This uses the same general AST-based jsmix as the prompt/print experiment. The
interpreter in `interpreter.js` is ordinary JavaScript, parsed and automatically
annotated, then fixed while split-shot specializes jsmix. There are no BF opcode
rules in the specializer or code-generation helpers.

## Language

Six commands: `+ - < > , .`. Sixteen initially zero byte cells; arithmetic wraps
modulo 256; EOF reads zero. Moving outside cells 0–15 raises RangeError. Other
text is ignored, as in BF, except `[` and `]`, which explicitly fail because
runtime loops are not in this subset. The interpreter returns its final pointer.

The runtime machine supplies get/set cell operations and byte read/write. The
provided `machine.cjs` implements the actual tape and I/O; they are ordinary
runtime operations, not staging callbacks.

## Build, inspect and run

From the repository root, with the dependencies/build from
`experiments/general-jsmix/README.md` installed:

```sh
node experiments/brainfuck-linear/build.cjs
node experiments/brainfuck-linear/check.cjs
node experiments/brainfuck-linear/run.cjs ',+>,-<.>.' '@C'
```

Actual example:

```text
Program: ,+>,-<.>.
Input: "@C"
Output: "AB"
Output bytes: [65, 66]
Final pointer: 1
```

The program reads a byte into cell 0, increments it, moves right, reads and
decrements cell 1, then outputs both cells. It finishes on cell 1.

`generated/brainfuck.output.txt` is the raw **24-block** second-projection
compiler. `generated/brainfuck.bindings.cjs` is that compiler after the separate
mechanical readability and binding passes. It loops over BF source and calls
generic residual-operation helpers.

`generated/example.target.js` is the actual target produced by that derived
compiler. The target has no BF instruction dispatch, source traversal or runtime
pointer variable. Movement has happened during compilation: it directly calls
`io.get(0)` / `io.get(1)` and writes those fixed cells. Increment/decrement remain
ordinary JavaScript arithmetic and `& 255`; input/output remain runtime calls.
Some calls use prepared method lookup and Reflect.apply to preserve JavaScript
receiver and argument evaluation order.

The sole generic language extension was support for JavaScript binary `&` in
the parser, static evaluator and residual operator helper. The generic derivation
script also accepts an output directory; BF supplies no custom specialization
rules.

## Validation

2,356 interpreter/target state-and-trace comparisons and 276 diagnostic checks
pass. Cases include exhaustive short programs, 250 deterministic random programs,
wrapping 255→0 and 0→255, EOF, comments, both tape boundaries, unsupported loop
syntax, 100 increments, and exceptions at every machine operation in the short
cases. Both raw and binding-cleaned compilers emit identical target source and
agree with direct jsmix specialization. Targets are executed and compared with
the interpreter for return value, entire tape, output bytes, consumed input and
ordered machine events. `generated/validation.json` retains the results.
