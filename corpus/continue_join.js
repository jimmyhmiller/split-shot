// inputs: [0, 3, 13, 20, "3"]
// max-lines: 140
// A `continue` under a dynamic test: the paths through the iteration join
// at the loop's update, where `j` merges, so the unrolled loop grows linearly
// (it split per value of `j`: quadratic).
function main(x) {
  var j = 0;
  for (var i = 0; i < 14; i++) {
    if (i == x) continue;
    j += 10;
  }
  return j;
}
