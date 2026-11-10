// @case {"description":"An own method shadows its prototype; dynamically selected callbacks retain actual function identity, and a method is resolved before argument mutation."}
function Box(x) { this.value = x; }
Box.prototype.run = function(y) { return this.value + y; };
function low(y) { return y - 5; }
function high(y) { return y + 10; }
function call(callback, value) { return callback(value); }
function main(x) {
  var object = new Box(x);
  object.run = function(y) { return this.value + y + 100; };
  var callback = x < 0 ? low : high;
  var selected = call(callback, x);
  var before = object.run((object.run = function(y) { return this.value - y; }, 2));
  return [selected, before, object.run(2), object.run === Box.prototype.run];
}
