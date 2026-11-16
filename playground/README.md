# split-shot playground

A browser playground for split-shot: a program on the left, what split-shot
makes of it on the right (the residual, the engine's IR, and its `--why`
account). Everything runs in the page.

There is nothing to configure. As on the command line, split-shot specializes
`main`, whose one parameter is the dynamic input. Each example ends with a
`main` that calls the code above it, with static arguments written as literals:

```js
function main(text) {
  return matches("a*b*c", text);
}
```

- `wasm/`: a wasm-bindgen wrapper around `js-frontend::specialize_full`, the
  CLI's pipeline. `specialize(src, entry, budget, source_names, why)` returns the
  residual JS, the IR dump, the `why` report as JSON, and the engine's counters.
- `web/`: the Vite page. split-shot runs in a Web Worker, which is restarted
  after a Rust panic (a panic leaves the wasm instance unusable) and after a
  timeout.
- A program with module syntax (`import`/`export`) is an ES module, linked as the
  CLI links a `.mjs` file (`js_frontend::link::link_source`, the entry module
  held in memory), and its exported `main` is specialized. Otherwise it is a
  plain script. (In a script, top-level functions are globals another script
  could replace; once there is top-level code, split-shot keeps calls through
  them. A module's bindings are its own.)
- The Interpreters examples are cases of the interpreter suite, imported from
  `tools/wild/interp` (see `docs/INTERP.md`).
- `examples/`: the example programs. An example may be several files (shown as
  tabs, specialized as one script in order): the compiler examples are an
  interpreter and its `main`, with `jsmix.js`, `binding-times.js` and
  `subset-parse.js` from `experiments/general-jsmix`. `cogen-lambda.js` is the
  third projection (see `experiments/readable-third-projection`).

Routes: `#/<example>`, and `#/?s=…` for a shared program (deflated JSON in the
URL).

```sh
cd web
npm install
npm run wasm    # build ../wasm into src/pkg (needs wasm-pack)
npm run dev
```

The site is published to GitHub Pages (https://jimmyhmiller.com/split-shot/)
by `.github/workflows/pages.yml` on each push to main that touches the engine
or the playground. The workflow builds the wasm with wasm-pack, then the site
with Vite (`base: "./"`, so it works under the repository's subpath).
