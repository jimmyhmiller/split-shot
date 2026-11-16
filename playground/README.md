# split-shot playground

A browser playground for split-shot, laid out like the Sweetener playground: a
toolbar with an example picker and Share, source on the left, output on the
right, each pane with tabs and a details footer. Everything runs in the page.

Three modes, one per Futamura projection:

- **1 · Specialize**: `mix(program, static args) = residual`. Pick a top-level
  function and mark each parameter static (its value is baked in) or dynamic (its
  value is only a sample to run with). The playground writes the one-parameter
  entry function split-shot specializes (see the `input.js` tab), shows the
  residual, the engine's IR and its `--why` account, and runs the original and the
  residual on the samples.
- **2 · Compiler**: `mix(jsmix, interpreter) = compiler`, with
  `experiments/general-jsmix`: its parser and binding-time analysis annotate the
  interpreter, split-shot specializes `jsmix.js` to it, and `tools/readable-js`
  makes a readable copy. Compiling a program checks the target against the
  interpreter (same result, same io calls), and against `jsmix(interpreter,
  program)` run directly (byte-identical).
- **3 · Cogen**: `mix(mix, mix) = cogen`, with `docs/p3/jsmix2.js`. The outer mix
  is jsmix2 itself (under a second), or split-shot specializing jsmix2 to itself
  (about 25 s in wasm). Every step is checked against running jsmix2 directly.

Layout:

- `wasm/`: a wasm-bindgen wrapper around `js-frontend::specialize_full`, the
  CLI's pipeline. `specialize(src, entry, budget, source_names, why)` returns the
  residual JS, the IR dump, the `why` report as JSON, and the engine's counters.
- `web/`: the Vite page. The engine runs in a Web Worker, restarted after a Rust
  panic (a panic leaves the wasm instance unusable) and after a timeout. The
  second projection's `.cjs` files are loaded as text through a small CommonJS
  shim (`src/cjs.js`), so the page runs those files, not copies.
- `examples/`: the first- and second-projection examples. The third projection's
  interpreters come from `docs/p3`.

Routes: `#/` (home), `#/play/<specialize|compiler|cogen>/<example>`, and
`#/play/<mode>?s=…` for a shared state (deflated JSON in the URL).

```sh
cd web
npm install
npm run wasm    # build ../wasm into src/pkg (needs wasm-pack)
npm run dev
```

The site is published to GitHub Pages (https://jimmyhmiller.github.io/split-shot/)
by `.github/workflows/pages.yml` on each push to main that touches the engine,
the playground, or the sources it imports. The workflow builds the wasm with
wasm-pack, then the site with Vite (`base: "./"`, so it works under the
repository's subpath). Pages must be set to deploy from GitHub Actions.
