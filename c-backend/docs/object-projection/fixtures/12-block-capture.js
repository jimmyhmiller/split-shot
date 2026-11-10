// @case {"description": "Escaping block lexical bindings remain live across later block allocations."}
function main(x) {
  var f, g;
  { let y = x + 1; f = function(z) { y += z; return y; }; }
  { let y = x + 10; g = function() { return y; }; }
  return [f(1), g(), f(2)];
}
