// Preserve negative zero, NaN, and both infinities as numeric results.
function main(input) {
  if (input < -1) return -1 / 0;
  if (input < 0) return -0;
  if (input === 0) return 0 / 0;
  if (input === 1) return 1 / 0;
  return 0 / (0 - input);
}
