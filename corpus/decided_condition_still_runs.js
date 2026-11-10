// inputs: [0, 1, 5]
// A branch whose condition the facts decide (`void e` is undefined) still
// evaluates that condition for what it does: here it throws. (A comparison
// decided by an earlier one, `x > 3` after `x > 5`, may skip converting an
// object again: an object's valueOf is assumed to answer consistently and do
// nothing else, as Prepack assumes.)
function main(n) {
  var out = [];
  try {
    out.push((void (n > 0 ? null : {}).a) ? "t" : "f");
  } catch (e) {
    out.push(e.name);
  }
  var probe = n > 0 ? n * 3 : -1;
  if (probe > 5) {
    if (probe > 3) out.push("big");
  }
  return out.join(",");
}
