// Runs the partial evaluator (Rust, compiled to wasm) and user programs off the
// main thread. The main thread kills and restarts this worker on a timeout or
// after a Rust panic, since a panic leaves the wasm instance unusable.
import init, { specialize } from "./pkg/partial_wasm.js";
import { p3 } from "./jsmix2-runtime.js";

let lastPanic = null;
self.__pePanic = (msg) => { lastPanic = msg; };

const ready = init();

function show(v) {
  if (v === undefined) return "undefined";
  if (typeof v === "number" && !Number.isFinite(v)) return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}

self.onmessage = async (e) => {
  const { id, kind } = e.data;
  try {
    if (kind === "specialize") {
      await ready;
      lastPanic = null;
      const t0 = performance.now();
      let r;
      try {
        r = specialize(e.data.src, e.data.budget || 0);
      } catch (err) {
        if (lastPanic !== null) {
          self.postMessage({ id, ok: false, error: lastPanic, fatal: true });
          return;
        }
        throw err;
      }
      const ms = performance.now() - t0;
      const out = { js: r.js, ir: r.ir, blocks: r.blocks, steps: r.steps, weight: r.weight, ms };
      r.free();
      self.postMessage({ id, ok: true, result: out });
    } else if (kind === "p3") {
      await ready;
      lastPanic = null;
      let result;
      try {
        result = p3(e.data.op, e.data.args, specialize);
      } catch (err) {
        if (lastPanic !== null) {
          self.postMessage({ id, ok: false, error: lastPanic, fatal: true });
          return;
        }
        throw err;
      }
      self.postMessage({ id, ok: true, result });
    } else if (kind === "eval") {
      // `body` is a function body that returns a value; `show` formats it.
      const value = Function(e.data.body)();
      self.postMessage({ id, ok: true, result: e.data.raw ? value : show(value) });
    }
  } catch (err) {
    self.postMessage({ id, ok: false, error: err && err.message ? err.message : String(err) });
  }
};
