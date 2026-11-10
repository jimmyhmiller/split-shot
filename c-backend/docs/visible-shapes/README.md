# Object layout the specializer can see

The object stage gets its speed on Richards from a whole-program type analysis in the encoder. That analysis proves nothing about code it was not written for (ordinary classes ran about 9x slower than Node), and it is not the technique this project is about. These probes ask whether the partial evaluator itself can remove property lookups when an object's shape is ordinary interpreter data instead of something hidden behind an opaque intrinsic.

Each file is a tiny interpreter fragment with an `entry(input)`. Run one with:

```
SPEC_WEIGHT_BUDGET=10000 PE_NO_SHARED_CONTEXTS=1 PE_CONTEXT_POINTS=1 \
  ../../../target/release/js-frontend --js --entry entry static-shape.js
```

The saved `*.residual.js` files are the outputs at split-shot `af01d9a`.

| Probe | What it does | Residual |
| --- | --- | --- |
| `static-shape.js` | The object is `{shape, slots}` with a statically known shape and dynamic slot values. | `return a * (a + 1)`: both lookups are gone. |
| `guarded-multi-exit.js` | The object is opaque; its shape id is a runtime number compared against static candidates, returning from inside each arm. | Each arm folds to a fixed slot load, but the code after the lookup is copied into every arm. Two lookups nest. |
| `guarded-single-exit.js` | The same guards as a recursive helper that assigns once and returns once. | The helper is left as a residual closure; nothing folds. |
| `guarded-loop-single-exit.js` | A loop over the candidates selects a slot number; one load then uses it. | Linear and fully folded: `if (id === 2) slot = 0; if (id === 3) slot = 2; load(o, slot, "x")`. |

So the mechanism works in this evaluator, in the fourth form: a lookup becomes a short chain of shape-id comparisons that pick a constant slot, with the generic lookup as the fallback when no candidate matches. That is a polymorphic inline cache whose entries are computed during specialization.

The probes do not say where a site's candidate shapes come from. The experiment below answers that. Nothing here has been wired into the object interpreter.

## Experiment: shapes discovered by specializing per receiver shape

`variants/` is a small object interpreter (`interpreter.js`) and a driver (`run.js`) for this guest program:

```js
function Vec(x, y) { this.x = x; this.y = y; }
Vec.prototype.add = function (o) { return new Vec(this.x + o.x, this.y + o.y); };
function Ent(p, v) { this.pos = p; this.vel = v; }
Ent.prototype.step = function () { this.pos = this.pos.add(this.vel); };
function main(n) { var e = new Ent(new Vec(1, 2), new Vec(n, 3)); var i = 0;
  while (i < 3) { e.step(); i = i + 1; } return e.pos.x + e.pos.y; }
```

Run it with `node variants/run.js` (after `cargo build --release -p js-frontend`), or `DYNAMIC_LOOP=1 node variants/run.js` to bound the loop by `n`.

**How it works.** Next to every guest value the interpreter keeps a shape id: a literal where the shape is known, a run-time number where it is not. Property access and method lookup are each written once, as "compare the id against every shape that has this key and select a slot (or a method)". The driver specializes each guest function per receiver shape from a worklist. A constructor specialized on an empty, unaliased receiver turns each `this.key = ...` into a static transition and reports its exit shape; that is where shapes come from. New shapes and variants found in a residual go back on the worklist until nothing changes. There is no analysis pass.

**Result, loop bound a constant (5 rounds, 6 shapes, 14 variants).** Residuals match plain JavaScript on four inputs. In one run of `main(7)` every one of the 22 property loads and 3 overwriting stores uses a slot chosen at specialization time or by a shape guard, the 12 property additions are static transitions, and all 12 calls go to a variant picked by literal or by guard. Nothing takes the generic path.

- `Vec` on an empty receiver is `hostAdd(this, 2, 0, x); hostAdd(this, 4, 1, y)`, exit shape `{x,y}`.
- `main` allocates each object at its final size and calls `Ent.step` as the literal variant for `{pos,vel}`: the receiver's shape is carried from `new Ent` through the local.
- `Ent.step` on `{pos,vel}` reads `this.pos` and `this.vel` at fixed slots. `this.pos.add(...)` needs a guard, because a value loaded from the heap has lost its shape.

**What it shows is still missing.**

- **A residual loop defeats it.** With `DYNAMIC_LOOP=1` the answers are still right and the callee variants are unchanged, but `main` is no longer specialized: the interpreter's `execute` and `evaluate` survive in its residual as closures (583 lines against 97). Removing the shape writes or the method call from the loop body does not change that, so it is the interpreter's own `while` over a recursive `execute` that the evaluator declines to unfold here. The object interpreter has the same construct and does get specialized, so this is specific to something in this small interpreter and needs the evaluator's owner to look.
- **Records do not survive loops at all.** The first version kept `{shape, exact, value}` records per value; under a residual loop the evaluator exhausted its budget. Parallel arrays of plain values are what it can carry.
- **Heap loads lose the shape.** Every `this.pos.x` pays a guard. Recording field shapes in the shape itself would make those static too.
- **A redundant second guard.** After a heap load the id is already the run-time shape, yet the lookup tries the run-time shape again when the first chain misses.
- **Assumptions made by fiat.** The class and method table is static data; real programs build it at run time. A guard chain lists every shape that has the key, with no cap. The rule that a known shape is a lower bound (sound for keys it has, not for absence or for adding) is argued in comments, not checked.
