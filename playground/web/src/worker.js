// Runs the partial evaluator (Rust, compiled to wasm) and user programs off the
// main thread. The main thread kills and restarts this worker on a timeout or
// after a Rust panic, since a panic leaves the wasm instance unusable.
import init, { specialize } from "./pkg/partial_wasm.js";
import { p2 } from "./p2-runtime.js";
import { p3 } from "./jsmix2-runtime.js";

let lastPanic = null;
self.__pePanic = (msg) => { lastPanic = msg; };

const ready = init();

export function show(v) {
  if (v === undefined) return "undefined";
  if (typeof v === "number" && !Number.isFinite(v)) return String(v);
  if (typeof v === "number" && Object.is(v, -0)) return "-0";
  if (typeof v === "function") return "[function " + (v.name || "anonymous") + "]";
  if (typeof v === "bigint") return v + "n";
  try { return JSON.stringify(v) ?? String(v); } catch { return String(v); }
}

// Run `f`, reporting a Rust panic (if one happened) instead of the trap it
// turned into.
async function engine(id, f) {
  await ready;
  lastPanic = null;
  try {
    return f();
  } catch (err) {
    if (lastPanic !== null) {
      const e = new Error("split-shot panicked: " + lastPanic);
      e.fatal = true;
      throw e;
    }
    throw err;
  }
}

self.onmessage = async (e) => {
  const { id, kind } = e.data;
  try {
    let result;
    if (kind === "specialize") {
      const { src, entry, budget, sourceNames, why } = e.data;
      result = await engine(id, () => {
        const t0 = performance.now();
        const r = specialize(src, entry, budget || 0, sourceNames, why);
        const ms = performance.now() - t0;
        const out = { js: r.js, ir: r.ir, why: r.why, blocks: r.blocks, steps: r.steps, weight: r.weight, ms };
        r.free();
        return out;
      });
    } else if (kind === "p2") {
      result = await engine(id, () => p2(e.data.op, e.data.args, specialize));
    } else if (kind === "p3") {
      result = await engine(id, () => p3(e.data.op, e.data.args, specialize));
    } else if (kind === "eval") {
      // `body` is a function body; its value comes back formatted by `show`.
      try {
        result = { ok: true, value: show(Function(e.data.body)()) };
      } catch (err) {
        result = { ok: false, value: err && err.name ? `${err.name}: ${err.message}` : "threw " + show(err) };
      }
    } else {
      throw new Error("unknown worker request " + kind);
    }
    self.postMessage({ id, ok: true, result });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err && err.message ? err.message : String(err), fatal: !!(err && err.fatal) });
  }
};
