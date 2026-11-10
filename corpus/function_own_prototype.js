// inputs: [0, 4]
// after: check()
// A function's prototype, still the object the function was made with, is
// that object in the residual too (`f.prototype`), reached before or after
// the function; a replaced prototype is set as before.
var holder = (function () {
  var count = 0;
  function Point(x) { this.x = x; count++; }
  Point.prototype.norm = function () { return Math.abs(this.x); };
  var box = { proto: Point.prototype };
  function Other() {}
  Other.prototype = { tag: "replaced" };
  return { Point: Point, box: box, Other: Other, made: function () { return count; } };
})();
globalThis.check = function () {
  var p = new holder.Point(-3);
  return [holder.box.proto === holder.Point.prototype, p.norm(), holder.Point.prototype.constructor === holder.Point,
    Object.getOwnPropertyNames(holder.Point.prototype).join(","), new holder.Other().tag,
    holder.Other.prototype.constructor === Object, holder.made(), Object.getOwnPropertyDescriptor(holder.Point, "prototype").writable].join("|");
};
function main(n) { return new holder.Point(n).norm(); }
