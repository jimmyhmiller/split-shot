// @case {"description": "Array push and pop, and Function.prototype.call with an explicit receiver and forwarded arguments, behave as builtins found through the root prototypes."}
function Stack() { this.items = []; }
Stack.prototype.add = function (value) { this.items.push(value); return this; };
Stack.prototype.take = function () { return this.items.pop(); };
function Base(name, weight) { this.name = name; this.weight = weight; }
Base.prototype.describe = function (suffix) { return this.name + ":" + this.weight + suffix; };
function Derived(name) { Base.call(this, name, 7); this.extra = true; }
function total(a, b) { return this.start + a + b; }
function main(x) {
  var list = [];
  var afterOne = list.push(x);
  var afterThree = list.push(x + 1, "two");
  var none = list.push();
  var last = list.pop();
  var stack = new Stack();
  stack.add(1).add(x).add("s");
  var top = stack.take(), next = stack.take();
  var empty = [];
  var nothing = empty.pop();
  var derived = new Derived("d");
  var borrowed = Base.prototype.describe.call({ name: "plain", weight: x }, "!");
  var summed = total.call({ start: 100 }, x, 5);
  var missing = total.call({ start: 1 }, x);
  var own = { call: function (v) { return v + 1; } };
  return [afterOne, afterThree, none, last, list.length, list[0], list[1], list[2] === undefined,
    top, next, stack.items.length, nothing === undefined, empty.length,
    derived.name, derived.weight, derived.extra, borrowed, summed, missing, own.call(x)];
}
