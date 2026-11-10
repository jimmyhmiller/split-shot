# split-shot

## Summary

An online partial evaluator for JavaScript. Given a program and the parts of its input that are known ahead of time, it runs everything that depends only on what is known and emits a residual program that does only the work that depends on runtime input. Every residual is checked against the original in Node.

It is strong enough for the Futamura projections: specializing an interpreter to a program compiles that program, and the target is to specialize engine262 (a JavaScript interpreter written in JavaScript).

Moved here from `PlayGround/claude-experiments/partial-new`, where it was developed. Start with `docs/HANDOFF.md` for the current state and `docs/NEXT-WORK.md` for the backlog.

## Layout

- `src/`: the specializer (the `partial` crate).
- `js-frontend/`: JavaScript parsing, lowering, codegen and the `js-frontend` CLI.
- `corpus/`, `corpus-modules/`, `prepack-probes/`: regression programs.
- `tools/gate.sh`: the regression gate.
- `playground/`: the web playground (WASM build of the specializer).
