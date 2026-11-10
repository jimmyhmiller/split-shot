// inputs: [0, 3]
// after: probe()
// A class still as its definition left it is made from its source in the
// residual (its heritage the parent the residual has); one changed since
// is built property by property. Both look like the original.
class Shape {
  area = 0;
  constructor(n) { this.n = n; }
  get size() { return this.n * 2; }
  set size(v) { this.n = v / 2; }
  grow() { return ++this.n; }
  static unit() { return new Shape(1); }
}
class Square extends Shape {
  constructor(n) { super(n); this.kind = "sq"; }
  grow() { return super.grow() * 10; }
}
class Changed { m() { return 1; } }
Changed.prototype.extra = function () { return 2; };
function names(o) { return Object.getOwnPropertyNames(o).sort().join(","); }
globalThis.probe = function () {
  var s = new Square(4);
  return [s.size, s.grow(), s.kind, s.area, Shape.unit().n, s instanceof Shape,
    names(Shape.prototype), names(Square), names(Changed.prototype), new Changed().extra(),
    typeof Object.getOwnPropertyDescriptor(Shape.prototype, "size").get].join("|");
};
function main(n) { return new Square(n).size + Shape.unit().grow(); }
