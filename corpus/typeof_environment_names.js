// inputs: [0, 1]
// `window`, `global` and `self` are names an environment may lack: `typeof` of one, and a read guarded by it, stay the runtime's (only `globalThis` is known to be the global object).
function main(input) {
  var perf = typeof global === "object" && global.performance || typeof window === "object" && window.performance || "none";
  return [typeof window === "object" && window.nothing ? 1 : 2, typeof self === "undefined" || typeof self === "object", typeof globalThis, perf === "none" || typeof perf === "object", input];
}
