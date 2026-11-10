# Futamura Playground

A browser playground for the partial evaluator: https://futamura-playground.vercel.app

- `wasm/`: a wasm-bindgen wrapper around `js-frontend`. It exposes `specialize(src, budget)`, which returns the residual as JS, the IR dump, and the engine's counters.
- `web/`: a Vite page. The engine runs in a Web Worker. It is restarted after a Rust panic, since a panic leaves the wasm instance unusable, and after a timeout.
- `examples/`: the first-projection presets. The expression interpreter and Brainfuck presets, plus the second-projection sources (`int.js`, `jsmix.js`, `parse.js`), are imported straight from `js-frontend/examples` and `docs/p2real`, so the page never carries a copy that can drift.

```sh
cd web
npm install
npm run wasm    # build ../wasm into src/pkg (needs wasm-pack)
npm run dev
./deploy.sh     # wasm + vite build, then a prebuilt deploy to Vercel (project futamura-playground)
```
