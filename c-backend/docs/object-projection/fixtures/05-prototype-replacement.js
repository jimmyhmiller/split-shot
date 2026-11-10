// @case {"description": "Replacing a constructor prototype affects new instances, not existing instance links."}
function A(x) { this.x = x; }
A.prototype.get = function() { return this.x; };
function main(x) {
  var a = new A(x), old = A.prototype;
  A.prototype = { get: function() { return 7; } };
  var b = new A(x);
  old.get = function() { return 8; };
  return [a.get(), b.get(), a.constructor === A, b.constructor === A,
    a.get === b.get];
}
