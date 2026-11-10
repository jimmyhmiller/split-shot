// inputs: ["1+2", "(3)*4+x", "", "2*(1+(2*3))"]
// forbid: parseInt
// A recursive-descent parser over a captured position, with a dynamic
// branch before it runs: a static source folds completely (the recursion
// takes only static decisions, so it is unfolded), a dynamic one becomes
// residual parser functions.
function main(input) {
  function evaluate(src) {
    var pos = 0;
    function peek() { return src.charAt(pos); }
    function number() {
      var start = pos;
      while (pos < src.length && src.charAt(pos) >= "0" && src.charAt(pos) <= "9") pos++;
      return Number(src.slice(start, pos));
    }
    function factor() {
      if (peek() === "(") { pos++; var v = expr(); pos++; return v; }
      return number();
    }
    function term() {
      var v = factor();
      while (peek() === "*") { pos++; v = v * factor(); }
      return v;
    }
    function expr() {
      var v = term();
      while (peek() === "+") { pos++; v = v + term(); }
      return v;
    }
    return expr();
  }
  var tag = input.length > 3 ? "long" : "short";
  return [tag, evaluate("1+2*(3+4)"), evaluate("(1+1)*(2+parseInt('2'))"), evaluate(input)].join(",");
}
