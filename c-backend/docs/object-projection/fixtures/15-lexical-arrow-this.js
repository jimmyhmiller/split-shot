// @case {"description": "An escaping arrow keeps its original this even when called as another object method."}
function Box(x) { this.x = x; }
Box.prototype.make = function(y) { return () => this.x + y; };
function main(x) {
  var a = new Box(x), f = a.make(2);
  var other = { x: 100, run: f };
  return [f(), other.run()];
}
