// @case {"description": "Loop break/continue and early return keep lexical frames and updates in order."}
function main(x) {
  var total = 0;
  for (var i = 0; i < 5; i++) {
    if (i === 1) continue;
    if (i === 4) break;
    total += i;
  }
  var n = 0;
  while (n < 3) { n++; if (n === 2) continue; total += n; }
  if (x < 0) return total;
  return total + x;
}
