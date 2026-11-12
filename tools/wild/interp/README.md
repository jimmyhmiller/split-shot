# Interpreter suite

The measure that matters most for split-shot: an interpreter given a fixed
program should specialize into compiled code for that program, which runs
much faster than the interpreter did. Every case here is one interpreter and
one fixed program; the runtime input is the program's input.

Run it with `node tools/interp.js` (it runs `tools/wild.js --cases
tools/wild/interp`: bundled by esbuild, checked against Node on every input
and over repeated calls, timed in processes of its own). The report is
`docs/INTERP.md`.

## A case

One ES module, `tools/wild/interp/<style>-<what>.mjs`:

```js
// style: stack-vm (string opcodes, switch dispatch, prog[pc++])
// residue: "OP_(PUSH|ADD|JZ)"
// A stack VM running a fixed program: the sum of i*i for i below n.
const PROGRAM = [["OP_PUSH", 0], ...];          // the fixed program
function run(prog, n) { ... }                   // the generic interpreter
export function main(input) { return run(PROGRAM, input.n); }
export const inputs = [{ n: 0 }, { n: 1 }, ...]; // plain JSON literals
```

- `main(input)` takes one JSON value and returns a JSON-able value. It is
  deterministic: no `Date`, `Math.random`, `process`, timers, I/O, `async`.
- `inputs`: at least 6 plain JSON literals, written in the file as a literal
  array. Include edge cases (empty, zero, error paths if the program has
  them) and inputs big enough that one call does real work (aim for 1–100
  µs per call in the original: loops that run, recursion that recurses).
- The interpreter is generic: it knows nothing of the program, and would run
  any program of its language. Write it the way people actually write that
  style of interpreter, not in a way shaped to help a specializer.
- The program is fixed in the module: as data at top level (an AST, a
  bytecode array), as source text parsed at load, or as source text parsed
  inside `main` (name such a case `...-parse-in-main`).
- `// residue: REGEX`: what must be gone from a residual that compiled the
  program away. Name the interpreter's dispatch data distinctively (opcode
  or node-type names like `OP_PUSH`, `"BinaryExpr"`) so the claim is
  precise. Leave it out only when nothing identifies interpretation.
- `// style:` one line naming the style, for the report.
- An npm interpreter (an existing library) is imported from
  `tools/wild/node_modules` (add it pinned to `tools/wild/package.json`),
  must bundle without Node built-ins, and must be synchronous.
