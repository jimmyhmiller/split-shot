// @case {"description":"Noncaptured sibling blocks and a nested for/body scope use disjoint promoted local slots without disturbing shadowed values."}
function main(x) {
  var sum = x;
  { let x = 2; sum += x; }
  { let x = 3; sum += x; }
  for (let i = 0; i < 2; i++) {
    let j = i;
    sum += j;
  }
  return sum;
}
