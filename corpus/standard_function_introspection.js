// inputs: [0, 1]
// What code learns of a standard function by looking at it folds while the
// built-ins are standard: `Object(f)` is it, `Object.prototype.toString` of it
// is "[object Function]", `Function.prototype.toString` its native source; a
// constructor's own and inherited well-known symbols (`@@species`,
// `@@hasInstance`) are there and no other; `RegExp(source)` is a regular
// expression. (Lodash's `getNative` decides each built-in it probes so.)
var funcToString = Function.prototype.toString;
var objectToString = Object.prototype.toString;
var hasOwn = Object.prototype.hasOwnProperty;
var reIsNative = RegExp("^" + funcToString.call(hasOwn).replace(/[\\^$.*+?()[\]{}|]/g, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$");
function probe(f) {
  return [Object(f) === f, objectToString.call(f), funcToString.call(f), reIsNative.test(funcToString.call(f)),
    Symbol.toStringTag in f, Symbol.species in f, Symbol.hasInstance in f, hasOwn.call(f, Symbol.species), typeof f[Symbol.toStringTag]];
}
function main(i) {
  return [probe(Map), probe(WeakMap), probe(Uint8Array), probe(Object.create), probe(Object.prototype.hasOwnProperty), globalThis == null, i];
}
