function main(input) {
  function Pair(x, y) { this.x = x; this.y = y; }
  var p = new Pair(input, 2);
  var alias = p;
  alias.x = p.x + p.y;
  p.y = alias.x * 0.25;
  return p.x - alias.y;
}
