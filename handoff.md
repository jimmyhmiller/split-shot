# Handoff: third projection on a real interpreter (2026-11-16)

> Historical handoff. The third projection now works, its playground result is
> precomputed, and our original binary WebAssembly interpreter is implemented.
> See `experiments/third-projection/README.md` and
> `experiments/wasm-binary/README.md` for current status. The store-lifting patch
> remains an archived investigation, not an applied engine change.

## The goal

The user wants the playground's third-projection example to run on a real
interpreter (Brainfuck), not the lambda calculus. The plan:

- Write a self-applicable offline flowchart `mix` in JavaScript (Jones, Gomard
  and Sestoft style).
- Run P1, P2 and P3 with it on Brainfuck.
- Have split-shot turn the result into readable JavaScript.

After that comes the queued request: our own real WebAssembly interpreter,
with clang-compiled C examples, for the playground (see the pad
`split-shot-playground`).

## Where it stands

All the code is in `experiments/third-projection/`. See its `README.md` for
the step-by-step account.

| Piece | State |
|---|---|
| `mix.js` + `flowchart.js` (front end, evaluator, builtins, division) | P1/P2/P3 work **in plain JS** on Brainfuck (`check-flowchart.cjs`, Hello World) |
| P1 through split-shot | works (0.8 s) |
| P2 through split-shot (evaluator specialized to the compiler mix makes, program a runtime value) | **works**, see below |
| P3 through split-shot (that compiler made at load by running the cogen through the evaluator) | **too slow**: over 30 min at load, killed by the timeout. The static evaluation of a 259-block cogen is the known slow path. |
| Playground examples for this | not started |

`node experiments/third-projection/check-compiler.cjs [interp.js] ['["dynamic","vars"]']`
builds the compiler and has split-shot specialize the evaluator to it. It then
checks that every program compiles exactly as the evaluator compiles it.

- `KEEP=file` saves the generated compiler.
- `PROGRAMS='[...]'` sets the programs (JSON).
- `P3=1` builds the compiler with the cogen instead (slow, see above).

The gate runs it on `tiny.js`.

Results at HEAD (`04c39f1`):

| Interpreter | Time | Lines | Evaluator left |
|---|--:|--:|---|
| `tiny.js` (`+`/`-` on an accumulator) | 4 s | 72 | no; clean JS loop |
| `tape.js` (tape + runtime pointer) | 4 s | 139 | no |
| `brainfuck-flat.js` (Brainfuck without `[ ]`) | 10 s | 169 | no |
| `brainfuck.js` (full; dynamic `["ptr"]`) | 61 s | 5425 | no; 7/7 programs incl. Hello World identical, **but its variable store is a runtime `Map`** (`c.get("vs")`, existence checks); correct but ugly |

## Engine changes this session (all committed, gate clean)

- `9e35da8`:
  - **Unpaired field lift.** A store's field whose list is rebuilt longer each
    round becomes a runtime variable, and the `Map` stays modeled
    (`ref_field_targets`, `PE_NO_UNPAIRED_FIELD_LIFT`).
  - **Frozen load-time arrays stay known** after escaping
    (`kept_on_escape`, `PE_NO_FROZEN_ARRAYS`, `PE_NO_KEEP_FROZEN`).
  - Two tests in `js-frontend/src/lib.rs`.
- `04c39f1`:
  - **`static_frame` followed into Map/Set contents.** It used to stop at a
    collection holding no runtime value itself, so the evaluator's loop never
    counted as runtime-controlled and unrolled without end. This was the real
    blocker (`PE_NO_STATIC_FRAME_REFS`). Typed arrays are excluded on
    purpose: `wasm-structured-vm` depends on that.
  - Frozen objects are also kept when a local slot is generalized.
  - The evaluator passes call arguments directly, with no argument list.
- Debug flags added along the way:
  - `UNROLL_DEBUG`: states met at a point.
  - `DYNLOOP_WHY`.
  - `WHISTLE_FRAMES_DEBUG`.
  - Slot names in `GENERALIZE_DEBUG`, call chains in `RESID_DEBUG`.
  - `GEN-REF-TARGET`/`GEN-REF-CHANGE` in `GEN_DEBUG`.
  - Shape changes in `FIELD_DEBUG`.

Gate on `04c39f1`:

- 159 tests pass.
- Corpus 294/294.
- why-check 0 worse.
- Matrix 0 wrong.
- Modules 54/54.
- prepack-hard BLOAT 1 (`capture_cycle`, there before this session).
- Interpreter suite the same as the committed `docs/INTERP.md` (31 of 52
  compiled). The only accepted trade-off is `rules-jsonlogic` at 481 lines,
  up from 466, at the same speed.

**To run the gate:** your uncommitted `docs/p2real/*` changes make its P2 step
report 16 blocks. Run it against HEAD's copy:

```
git archive HEAD docs/p2real | tar -x -C $TMPDIR/p2head
ln -sfn $PWD/target $TMPDIR/p2head/target
sed "s#docs/p2real/#$TMPDIR/p2head/docs/p2real/#g" tools/gate.sh > tools/.gate-rest.sh
bash tools/.gate-rest.sh; rm tools/.gate-rest.sh
```

Then run `node tools/interp.js --timeout 120 --md /tmp/I.md` and diff its
rows (verdict, compiled, lines) against `docs/INTERP.md`.

## Work in progress (NOT committed): `handoff-wip-store-lift.patch`

The aim is to keep the Brainfuck compiler's store modeled, as tiny's is. Apply
it with `git apply handoff-wip-store-lift.patch`. It is untested against the
gate and the suite. With it applied, tiny, tape and brainfuck-flat still pass,
and Brainfuck still passes 7/7, but its store is **still** a runtime `Map`.

What the patch does:

- Lifts a field whose earlier value was the program's frozen `[]` literal.
  The compiler's `code` starts as the literal `["lit", []]`, a frozen
  load-time object.
- Gives a field that now holds a frozen object that object's runtime value,
  without un-modeling the object (`frozen_fields` in `ref_field_targets`).
- When the heaps aren't alike, compares only the objects both hold
  (`common_seen`/`common_g`, which replaces `without_lifted_fields`).
- Adds debug lines: `REFT_DEBUG`, `[GEN-CMP]`, and a `FIELD_DEBUG` line for
  shape changes.

Where it stops: at the evaluator's loop head (`runFlowchart` pc 17404), the
**reverse** direction of the generalization fails. The earlier state's store
`Map` holds objects, while the merged state's store holds runtime values.
`heap_field_changes` then rejects the `Map` because its *values* differ
between the two (`[FIELD] none: @… changed shape` on the Map). That code
compares built-ins by full content, and its Map branch is not reached
there. Next step: find why it falls through to `_ => return None` for two
Maps with the same keys. My guess is that `ext`, or the stride/`live`
entries, differ. Make it pair them field by field.

## Other open threads

- **P3 speed.** Running the 259-block cogen through the evaluator at load
  is a long, fully static computation, and split-shot's per-step cost (state
  keys, whistle comparisons, gc) makes it take more than 30 minutes. An
  engine fast path for long static computations is the known next piece
  (see the pad `split-shot-third-projection`).
- **Playground.** None of this is in the playground yet. The intended
  examples:
  - P2: the Brainfuck compiler as JS.
  - P3: the cogen-made compiler, once P3 is fast enough.

  They go in `playground/web/src/examples.js` as `main.mjs` files with the
  interpreter inline (the user wants interpreters in `main`). Check them
  against the CLI with `$TMPDIR/pw/same.cjs`. The site deploys via
  `.github/workflows/pages.yml` on push.
- **WebAssembly VM** (queued after this): write our own (binary decoder,
  stack machine, structured control, memory, calls, `call_indirect`,
  i32/i64/f64) with clang-compiled C checked against native WebAssembly. Do
  not use `henry-the-frog/wasm-interpreter`: it has no licence.

## Housekeeping

- The pads `split-shot-third-projection` and `split-shot-playground` (linked
  from `split-shot`) hold the running notes.
- A Vite dev server for the playground may still be running on port 5199,
  started from a background shell.
- Commits never carry Co-Authored-By or "Generated with" lines.
