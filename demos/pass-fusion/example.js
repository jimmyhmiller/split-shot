// A numeric kernel: all parameters are numbers, with ordinary local reads.
function score(x, y, enabled) {
  return enabled
    ? ((x ** (1 + 1)) * 1 + (6 * 7)) / 1
    : +(y * 1);
}
