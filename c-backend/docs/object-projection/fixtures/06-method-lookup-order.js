// @case {"description": "Resolve a method before arguments mutate its property and retain the receiver."}
function main(x) {
  var o = { value: x, run: function(y) { return this.value + 1; } };
  var first = o.run(o.run = function() { return 9; });
  return [first, o.run()];
}
