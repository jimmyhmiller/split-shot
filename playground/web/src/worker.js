// Runs split-shot (Rust, compiled to wasm) off the main thread. The main
// thread kills and restarts this worker on a timeout or after a Rust panic,
// since a panic leaves the wasm instance unusable.
import init, { specialize } from "./pkg/partial_wasm.js";

let lastPanic = null;
self.__pePanic = (msg) => { lastPanic = msg; };

const ready = init();

self.onmessage = async (e) => {
  const { id, src, entry, budget, sourceNames, why } = e.data;
  try {
    await ready;
    lastPanic = null;
    let r;
    const t0 = performance.now();
    try {
      r = specialize(src, entry, budget || 0, sourceNames, why);
    } catch (err) {
      if (lastPanic !== null) {
        self.postMessage({ id, ok: false, error: "split-shot panicked: " + lastPanic, fatal: true });
        return;
      }
      throw err;
    }
    const ms = performance.now() - t0;
    const result = { js: r.js, ir: r.ir, why: r.why, blocks: r.blocks, steps: r.steps, weight: r.weight, ms };
    r.free();
    self.postMessage({ id, ok: true, result });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err && err.message ? err.message : String(err) });
  }
};
