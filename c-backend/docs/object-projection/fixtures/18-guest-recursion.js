// @case {"description": "Guest functions recurse and mutually recurse through residual entrypoints."}
function main(x) {
  function factorial(n) { if (n < 2) return 1; return n * factorial(n - 1); }
  function even(n) { if (n <= 0) return true; return odd(n - 1); }
  function odd(n) { if (n <= 0) return false; return even(n - 1); }
  return [factorial(x), even(x), odd(x)];
}
