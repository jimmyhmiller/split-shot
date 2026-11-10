// @case {"description": "arguments holds every value a function was called with, independent of its parameter count; an arrow function sees its enclosing function's."}
function count() { return arguments.length; }
function sum(first) {
  var total = 0, i = 0;
  while (i < arguments.length) { total = total + arguments[i]; i = i + 1; }
  return total + first * 1000;
}
function viaArrow(a) { var read = () => arguments[1] + a; return read(); }
function keep() { return arguments; }
function Holder() { this.items = arguments; this.n = arguments.length; }
function main(x) {
  var kept = keep(x, "two", null);
  var held = new Holder(x, x + 1);
  return [count(), count(x), count(x, x, x), sum(x, 2, 3), sum(), viaArrow(x, 7),
    kept.length, kept[0], kept[1], kept[2], kept[3] === undefined,
    held.n, held.items[1], keep() !== keep()];
}
