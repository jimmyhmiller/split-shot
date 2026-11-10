// @case {"description": "Logical operators preserve operand values and skip unselected effects."}
function main(x) {
  var n = 0;
  function bump() { n++; return n; }
  var a = false && bump();
  var b = true || bump();
  var c = x && bump();
  var d = x || bump();
  var e = x ? bump() : 9;
  return [a, b, c, d, e, n];
}
