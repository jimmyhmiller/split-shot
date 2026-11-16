// Evaluate a polynomial with Horner's rule. The coefficients are static and x
// is dynamic, so the loop unrolls into one arithmetic expression. Zero
// coefficients still show up as `0 * x` and `+ 0`: the evaluator folds
// constants, but it does not apply algebraic identities to dynamic values.
function poly(coeffs, x) {
  let acc = 0;
  for (let i = 0; i < coeffs.length; i++) {
    acc = acc * x + coeffs[i];
  }
  return acc;
}

function main(x) {
  // 3x^3 + 2x + 5
  return poly([3, 0, 2, 5], x);
}
