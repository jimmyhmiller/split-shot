// @case {"description": "Constructor allocation falls back to Object.prototype when prototype is primitive."}
function A(x) { this.x = x; }
function main(x) {
  A.prototype = 42;
  var a = new A(x);
  A.prototype = null;
  var b = new A(x + 1);
  A.prototype = undefined;
  var c = new A(x + 2);
  return [a.x, b.x, c.x, a === b, a.constructor === A];
}
