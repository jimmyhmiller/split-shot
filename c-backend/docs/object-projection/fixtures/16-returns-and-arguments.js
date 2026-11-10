// @case {"description": "Fallthrough, bare return, missing parameters and excess arguments follow guest call rules."}
function main(x) {
  function empty(a) { a = x; }
  function bare() { return; }
  function missing(a, b) { return [a, b]; }
  function first(a) { return a; }
  return [empty(), bare(), missing(x), first(x, 99, 100)];
}
