// Main-thread handle on the worker: request/response with timeouts, and a
// fresh worker after a timeout or a fatal (panic) error.
let worker = null;
let nextId = 1;
const pending = new Map();

function spawn() {
  worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
  worker.onmessage = (e) => {
    const p = pending.get(e.data.id);
    if (!p) return;
    pending.delete(e.data.id);
    clearTimeout(p.timer);
    if (e.data.fatal) restart();
    if (e.data.ok) p.resolve(e.data.result);
    else p.reject(new Error(e.data.error));
  };
}

function restart() {
  if (worker) worker.terminate();
  for (const [, p] of pending) { clearTimeout(p.timer); p.reject(new Error("the worker was restarted")); }
  pending.clear();
  spawn();
}

function call(msg, timeoutMs) {
  if (!worker) spawn();
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      restart();
      reject(new Error(`timed out after ${timeoutMs / 1000} s (the worker was restarted)`));
    }, timeoutMs);
    pending.set(id, { resolve, reject, timer });
    worker.postMessage({ id, ...msg });
  });
}

export const specialize = (src, { entry = "main", budget = 0, sourceNames = true, why = true } = {}) =>
  call({ kind: "specialize", src, entry, budget, sourceNames, why }, 60000);
export const evaluate = (body, timeoutMs = 3000) => call({ kind: "eval", body }, timeoutMs);
export const p2 = (op, args, timeoutMs = 60000) => call({ kind: "p2", op, args }, timeoutMs);
export const p3 = (op, args = {}, timeoutMs = 60000) => call({ kind: "p3", op, args }, timeoutMs);
// Start the worker (and its wasm) before the first request needs it.
export function warm() { if (!worker) spawn(); }
