// @case {"description": "Constructor allocation, method receivers, inherited fields, identity and own shadowing."}
function Box(x) { this.x = x; }
Box.prototype.tag = 7;
Box.prototype.add = function(y) { return this.x + y; };
function main(x) {
  var a = new Box(x), alias = a, b = new Box(x);
  var inherited = a.tag;
  a.tag = 9;
  return [a.add(2), inherited, a.tag, b.tag, a === alias, a === b,
    a.constructor === Box, a.add === b.add];
}
