// A function a module's escaping closure captures is a runtime value of
// known code in that closure's body: calls of it run its code (its own
// captures known as well), and it is still that one runtime function where
// it is passed on or compared.
var api = {};
(function () {
  var scale = 10;
  function square(x) { return x * x; }
  function scaled(x) { return square(x) * scale; }
  function sumScaled(a, b) { return scaled(a) + scaled(b); }
  function same(f) { return f === square; }
  api.sumScaled = sumScaled;
  api.same = same;
  api.square = square;
  api.give = function () { return square; };
})();
inspect = function () {
  return [api.sumScaled(3, 4), api.same(api.square), api.give() === api.square, api.give()(5)].join(",");
};
