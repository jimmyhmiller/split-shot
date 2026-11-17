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

export function cancelSpecialization() {
  if (worker) worker.terminate();
  worker = null;
  for (const [, p] of pending) { clearTimeout(p.timer); p.reject(new Error("the worker was restarted")); }
  pending.clear();
}

function restart() {
  cancelSpecialization();
  spawn();
}

function call(msg, timeoutMs) {
  // A new source replaces the previous request. Stop its computation now,
  // rather than leaving it ahead of the new example in the worker queue.
  if (pending.size) restart();
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
  call({ src, entry, budget, sourceNames, why }, 300000);
