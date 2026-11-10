// Host builtins available to jsmix2, to the programs it specializes, and to the
// residual programs it emits.
function str(v) { return JSON.stringify(v); }
function isArr(v) { return Array.isArray(v); }
function kind(v) { return v === null ? "null" : Array.isArray(v) ? "array" : typeof v; }
function fail(msg) { throw new Error(msg); }
if (typeof module !== "undefined") module.exports = { str, isArr, kind, fail };
