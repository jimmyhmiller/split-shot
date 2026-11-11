// inputs: [{"list":[1,2,3]}, {"list":[]}, {"list":[5],"again":true}, {"list":[7,8],"again":true}]
// forbid-main: twice|\.value|\.bind
// A function handed to code not known here (a method of the input) is a runtime function from then on, but its code and what it captured cannot change: a later call of it still runs that code here. So does a call through a function it was passed to, and one made after a second escape.
function main(input) {
  var K = 10;
  function scale(x) { return x * K; }
  function twice(f, x) { return f(f(x)); }
  function apply(f, x) { return f(x) + 1; }
  var mapped = input.list.map(scale);
  var n = scale(mapped.length) + twice(scale, 2) + apply(scale, 3);
  if (input.again) {
    var more = input.list.filter(function (v) { return apply(scale, v) > 60; });
    n += apply(scale, more.length);
  }
  return [mapped, n];
}
