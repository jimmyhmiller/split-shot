// @case {"description": "Function declarations are stable references and capture the enclosing environment."}
function main(x) {
  function f(y) { return x + y; }
  var g = f;
  return [f === f, g === f, g(2), f === function(y) { return x + y; }];
}
