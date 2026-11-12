// inputs: [0, 1, 2, 3]
// host-globals: declared
// forbid-main: typeof (process|define|navigator)
// With the host's globals declared, a library's probe of one the host does
// not have folds: `typeof` of it is "undefined", the global object's
// property of its name is undefined, `in` it is false. A reference to one
// still throws, at runtime; one the program itself defines, at load or from
// `main`, is there from then on; the declared ones are left to the runtime.
var isNode = typeof process === "object" && process !== null && typeof process.env === "object";
var amd = typeof define === "function" && define.amd;
var root = typeof global === "object" && global ? global : typeof self === "object" && self ? self : globalThis;
var defined = typeof laterOnes;
globalThis.laterOnes = 1;
var after = typeof laterOnes;
function nav() { return typeof navigator !== "undefined" ? navigator.userAgent : "no navigator"; }
function read() { try { return window.document; } catch (e) { return e.name; } }
function main(i) {
  if (i === 3) globalThis.fromMain = i;
  return [isNode, amd, root === globalThis, defined, after, nav(), read(), "process" in globalThis, globalThis.process, typeof console, typeof fromMain, typeof TextEncoder];
}
