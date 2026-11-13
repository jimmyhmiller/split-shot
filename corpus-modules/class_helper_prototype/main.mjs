// A class as a compiler's helper makes it (Babel's `_createClass`): its
// methods defined on `C.prototype` from descriptors, then
// `Object.defineProperty(C, "prototype", { writable: false })`. That last
// definition is one of a function's own `prototype` property, which the
// model holds: done at load, so the class stays known, its methods are
// called directly, and the load code needs no helper. The property is
// then read-only as the helper left it, in the residual too.
function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var d = props[i];
    d.enumerable = d.enumerable || false;
    d.configurable = true;
    if ("value" in d) d.writable = true;
    Object.defineProperty(target, d.key, d);
  }
}
function _createClass(C, protoProps, staticProps) {
  if (protoProps) _defineProperties(C.prototype, protoProps);
  if (staticProps) _defineProperties(C, staticProps);
  Object.defineProperty(C, "prototype", { writable: false });
  return C;
}
var Counter = (function () {
  function Counter(start) { this.n = start; }
  return _createClass(Counter, [
    { key: "add", value: function add(k) { this.n += k; return this; } },
    { key: "double", value: function double() { this.n *= 2; return this; } },
  ], [{ key: "of", value: function of(n) { return new Counter(n); } }]);
})();
export function main(input) {
  var c = Counter.of(input.n).add(3).double();
  var d = Object.getOwnPropertyDescriptor(Counter, "prototype");
  var threw = false;
  try {
    Counter.prototype = { add: null };
  } catch (e) {
    threw = e instanceof TypeError;
  }
  return [c.n, d.writable, d.enumerable, d.configurable, threw, typeof Counter.prototype.add, input.keep ? typeof Counter : null];
}
