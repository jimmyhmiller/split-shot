// @case {"description": "Captured call frames survive return and independent factory calls stay separate."}
function main(x) {
  function make(y) { return function(z) { y += z; return y; }; }
  var f = make(x), g = make(x + 10);
  return [f(2), g(3), f(4), g(5)];
}
