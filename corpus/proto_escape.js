// inputs: [0, 2, 5]
// Instances that escape keep their prototype, methods and attributes at runtime.
function Shape(w) { this.w = w; }
function main(x) {
  Shape.prototype.area = function () { return this.w * this.w; };
  var s = new Shape(x);
  var t = new Shape(3);
  var both = [s, t];
  var r = both[x % 2];
  return [r.area(), r instanceof Shape, Object.keys(r).join(","), r.constructor === Shape, typeof r.area];
}
