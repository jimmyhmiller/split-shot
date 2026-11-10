// The textbook first example of partial evaluation: power(x, n).
// n is static, x is dynamic, so the recursion unrolls and only the
// multiplications are left.
function power(x, n) {
  if (n === 0) return 1;
  return x * power(x, n - 1);
}

function main(x) {
  return power(x, 5);
}
