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

What the probes do not answer is where a site's candidate shapes come from. Nothing here has been wired into the object interpreter.
