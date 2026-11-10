// @case {"description": "Deep guest recursion exhausts the bounded call-frame region with a clear capacity failure.", "mode": "capacity", "inputs": ["300"]}
function main(x) {
  function descend(n) {
    var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0;
    if (n === 0) return 0;
    return 1 + descend(n - 1);
  }
  return descend(x);
}
