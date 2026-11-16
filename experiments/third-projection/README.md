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

## Step 2: an offline flowchart mix (works in JavaScript)

`flowchart.js` is a flowchart language with JavaScript's expressions (after the
flowchart `mix` of Jones, Gomard and Sestoft), a front end from a JavaScript
function of the subset (var, if, while, return) to flowchart blocks, an
evaluator, the builtins mix uses, and a binding-time division. `mix.js` is the
offline specializer, one ordinary JavaScript function in the subset it
specializes: a worklist of (block, static values) states, residual blocks
labeled S0, S1, ..., static tests decided and followed, dynamic ones emitted,
and the block a state starts at found by walking the blocks one can start at
("The Trick"). `brainfuck.js` is a Brainfuck interpreter in the same subset.

`node check-flowchart.cjs` (`ulimit -s 65520 && node --stack-size=60000`):
the cogen (mix applied to itself, 259 blocks, 5 ms) applied to the Brainfuck
interpreter gives exactly the compiler mix makes of itself for it (155 blocks,
4 ms), which gives exactly the first projection's targets, which print
"Hello World!" and the rest. In mix's division the worklist position `n` is made
dynamic (static, it would only grow); in Brainfuck's, the tape pointer `ptr`
(a program may move it without bound).

What it took to get there from 2,785 blocks and 79 MB: states labeled by their
place in the worklist (not by their text, which held whole programs); The Trick
over only the entry and the targets of dynamic tests; the front end's empty
goto-only blocks bypassed; states compared by structure with the same object
equal at once (not by `JSON.stringify`).

## Through split-shot

The first projection works: with the target made at load, split-shot compiles
the evaluator away and leaves the Brainfuck program as JavaScript (0.8 s); the
evaluator dispatches on a numeric block index, as a VM on its program counter
(by label, from a `Map`, it did not compile). The second and third do not yet:
making the compiler (or the cogen) at load is a large static computation that
V8 does in milliseconds and split-shot's static evaluation takes minutes over
(every loop iteration is a block whose state is keyed, hashed and weighed by the
whistle, at a cost that grows with the heap), or gives up on. That is the next
piece of work: an engine fast path for long fully static computation.
