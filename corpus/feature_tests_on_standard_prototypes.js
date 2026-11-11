// inputs: [{"s":"  a b  "}, {"s":""}]
// forbid-main: typeof (String\.prototype\.trimLeft|Array|Function|\(?"x)|replace|WeakMap|Map\.prototype \?
// A library choosing an implementation by testing for a standard method (`typeof String.prototype.trimLeft === "function"`, jmespath's) is answered: the test folds, and so does `trimLeft`/`trimRight` itself on a known string. A primitive's methods are its prototype's (`typeof "x".padStart`), and an inherited one is found up the chain (`Array.prototype.hasOwnProperty`). A standard constructor's `prototype` is an object, so a test of it (`Map.prototype ? ... : null`, object-inspect's) folds. A method no engine is known to have is still tested at runtime.
function main(input) {
  var trimLeft = typeof String.prototype.trimLeft === "function"
    ? function (s) { return s.trimLeft(); }
    : function (s) { return s.replace(/^\s+/, ""); };
  var hasPad = typeof "x".padStart === "function";
  var hasFlat = typeof Array.prototype.flat === "function";
  var hasOwn = typeof Array.prototype.hasOwnProperty;
  var noSuch = typeof String.prototype.noSuchMethod;
  var mapSize = Map.prototype ? Object.getOwnPropertyDescriptor(Map.prototype, "size") ? "has size" : "no size" : null;
  return [trimLeft(input.s), trimLeft("  x "), " y ".trimRight(), hasPad, hasFlat, hasOwn, noSuch, typeof Function.prototype.bind, !!WeakMap.prototype];
}
