# split-shot

## Summary

An online partial evaluator for JavaScript. Given a program and the parts of its input that are known ahead of time, it runs everything that depends only on what is known and emits a residual program that does only the work that depends on runtime input. Every residual is checked against the original in Node.

It is strong enough for the Futamura projections: specializing an interpreter to a program compiles that program, and the target is to specialize engine262 (a JavaScript interpreter written in JavaScript).

Moved here from `PlayGround/claude-experiments/partial-new`, where it was developed. Start with `docs/HANDOFF.md` for the current state and `docs/NEXT-WORK.md` for the backlog.

## What to expect of a program's shape

How much is known in `main` depends on who else could have touched the program's state:

- **An ES module** (`export function main(input)`, with its imports): its top-level bindings are its own. What its top-level code builds (a parsed template, a compiled matcher, class instances) is known in `main`, and that code runs once, as the residual's load code.
- **A plain script**: its top-level `let`/`const`/`class` are open to other scripts unless `--closed-script` says otherwise, and its `var`s and functions are properties of the global object that any code the specializer does not see may reassign. A class instance's methods are then the runtime's.
- **Everything inside `main`**: all known, and all redone per call.

`--why` (below) says which of these a residual is paying for.

## Layout

- `src/`: the specializer (the `partial` crate).
- `js-frontend/`: JavaScript parsing, lowering, codegen and the `js-frontend` CLI.
- `corpus/`, `corpus-modules/`, `prepack-probes/`: regression programs.
- `tools/gate.sh`: the regression gate.
- `tools/why.js`: what every corpus residual still holds and for what cause (the specializer's `--why` account, `src/js/why.rs`), ranked, with a ratchet in `corpus/why-baseline.json`.
- `tools/matrix.js`, `tools/matrix/`: the reduction matrix, every feature in every binding-time context; its table is `docs/REDUCTION-MATRIX.md`.
- `js-frontend/src/prelude.js`: self-hosted built-ins. A function `__pe_std_<Name>` there is the model of the standard function `<Name>`.
- `playground/`: the web playground (WASM build of the specializer).
