# The third projection on a real interpreter (in progress)

The goal: one plain program in which a JavaScript specializer is applied to
itself to make a cogen, the cogen is applied to a Brainfuck interpreter to make
a Brainfuck compiler, and split-shot specializes through all of it, so the
residual is that compiler as JavaScript. split-shot cannot be the specializer
applied to itself (it is Rust, and it is the outer specializer), so a
self-applicable JavaScript specializer is needed whose output can be run inside
the program with no `Function(...)`.

## Step 1: mix3 (done)

`mix3.js` is jsmix2 (`docs/p3/jsmix2.js`) emitting programs as syntax trees in
the format it reads (parse2's) rather than JavaScript text; `eval3.js` runs
those trees. `node check.cjs` (with a large stack:
`ulimit -s 65520 && node --stack-size=60000 check.cjs`) checks the three
projections on `docs/p3/int.js` and `docs/p3/vm.js`: the targets compute what
the interpreters do, the compiler mix3 makes of itself makes those targets, and
the cogen (mix3 applied to itself) makes those compilers.

## What it measured

The design is jsmix2's: online, values tagged static or dynamic. Its
self-application is bloated: the cogen is 487 functions and 4.3 MB as a tree,
a compiler for a ten-line interpreter 202 functions and 184 KB. split-shot,
asked to specialize the evaluator to such a compiler (the residual a playground
example would show), did not finish in ten minutes.

## Next

An offline specializer (a binding-time division first, then specialization),
which is what makes self-application yield small compilers: the flowchart
`mix` of Jones, Gomard and Sestoft, with a front end from the JavaScript subset
(while, if, var, arrays) to flowchart blocks, so the specializer and the
interpreters are written in ordinary JavaScript.
