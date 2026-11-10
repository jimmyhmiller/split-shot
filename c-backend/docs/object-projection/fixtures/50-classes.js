// @case {"description": "Classes: constructors, methods, static members, instance and static fields, inheritance with super calls and super method calls, default constructors, class expressions, and instanceof through the chain."}
class Shape {
  sides = 0;
  tags = [];
  static count = 0;
  static create(name) { Shape.count = Shape.count + 1; return new this(name); }
  constructor(name) { this.name = name; this.tags[this.tags.length] = "shape"; }
  describe() { return this.name + "/" + this.sides + "/" + this.area(); }
  area() { return 0; }
  static kind() { return "shape"; }
}
class Rect extends Shape {
  sides = 4;
  constructor(name, w, h = w) { super(name); this.w = w; this.h = h; this.tags[this.tags.length] = "rect"; }
  area() { return this.w * this.h; }
  describe() { return "[" + super.describe() + "]"; }
  static kind() { return "rect<" + super.kind(); }
}
class Square extends Rect {
  label = this.name + "!";
  area() { return super.area() + 0.5; }
}
class Plain {}
function main(x) {
  var shape = new Shape("s"), rect = new Rect("r", 2, x), square = new Square("q", 3);
  var Anonymous = class { constructor(v) { this.v = v; } twice() { return this.v * 2; } };
  var Named = class Inner { static make() { return new Inner(); } who() { return typeof Inner; } };
  var made = Shape.create("made"), other = Rect.create("via-this");
  var extended = class extends Anonymous { twice() { return super.twice() + 1; } };
  var counter = { n: 0 };
  class Local { constructor() { counter.n = counter.n + 1; this.id = counter.n; } }
  new Local();
  return [shape.describe(), rect.describe(), square.describe(), square.label, square.sides, rect.tags, shape.tags.length,
    Shape.kind(), Rect.kind(), Square.kind(), Shape.count, made.name, other instanceof Rect, other.w === undefined,
    square instanceof Square, square instanceof Rect, square instanceof Shape, rect instanceof Square,
    new Plain() instanceof Plain, typeof Shape, new Anonymous(x).twice(), new extended(x).twice(),
    Named.make().who(), new Local().id, Square.prototype.constructor === Square, rect.constructor === Rect,
    square.hasOwnTags === undefined, "area" in square, "sides" in square];
}
